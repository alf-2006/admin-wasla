import * as XLSX from 'xlsx';
import type { Member, MemberInsert } from '../../types/db';

type Row = Record<string, unknown>;
const isRow = (value: unknown): value is Row => typeof value === 'object' && value !== null && !Array.isArray(value);
const clean = (value: unknown) => Array.from(String(value ?? ''))
  .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
  .join('').trim();
const cell = (row: Row, names: string[]) => names.map((name) => row[name]).find((value) => value !== undefined && value !== null && clean(value) !== '');

export function parseMemberWorkbook(buffer: ArrayBuffer, knownMembers: Member[]) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('الملف لا يحتوي على ورقة بيانات.');
  const rows = XLSX.utils.sheet_to_json<unknown>(sheet).filter(isRow);
  const imported: MemberInsert[] = [];
  const seenNames = new Set<string>();
  const seenEmails = new Set<string>();
  const knownNames = new Set(knownMembers.map((member) => member.full_name.trim().toLocaleLowerCase('ar')));
  let skipped = 0;
  for (const row of rows) {
    const name = clean(cell(row, ['الاسم الكامل', 'الاسم', 'اسم العضو', 'Name']));
    const email = clean(cell(row, ['البريد الإلكتروني', 'البريد', 'Email'])).toLowerCase();
    if (!name || !email.includes('@')) { skipped++; continue; }
    const normalizedName = name.toLocaleLowerCase('ar');
    if (seenEmails.has(email) || seenNames.has(normalizedName) || knownNames.has(normalizedName)) { skipped++; continue; }
    seenEmails.add(email); seenNames.add(normalizedName);
    const alex = cell(row, ['نزول الإسكندرية', 'متاح لنزول الإسكندرية', 'Alexandria']);
    imported.push({
      full_name: name, 
      email,
      completion_rank: null,
      team_notes: null,
      device: clean(cell(row, ['الجهاز', 'الجهاز المتوفر', 'Device'])) || 'لابتوب',
      residence: clean(cell(row, ['محل الإقامة', 'الإقامة'])) || null,
      phone: clean(cell(row, ['رقم الهاتف', 'الهاتف'])) || null,
      bio: clean(cell(row, ['نبذة', 'الدور'])) || null,
      gender: clean(cell(row, ['الجنس'])) || null,
      meeting_attendance: clean(cell(row, ['الحضور', 'حضور الاجتماعات'])) || null,
      work_status: clean(cell(row, ['حالة العمل', 'حالة الاستعداد'])) || 'active',
      work_conditions: clean(cell(row, ['ظروف العمل'])) || null,
      can_go_alexandria: alex === 'نعم' || alex === true || alex === 1,
    });
  }
  return { members: imported, skipped };
}

export function downloadMembersWorkbook(members: Member[]) {
  const rows = members.map((member) => ({
    'الاسم الكامل': safeCell(member.full_name), 'البريد الإلكتروني': safeCell(member.email),
    'الجهاز المتوفر': safeCell(member.device), 'محل الإقامة': safeCell(member.residence),
    'رقم الهاتف': safeCell(member.phone),
    'متاح لنزول الإسكندرية': member.can_go_alexandria ? 'نعم' : 'لا',
    'حالة العمل': safeCell(member.work_status), 'نبذة / الدور': safeCell(member.bio),
    'الجنس': safeCell(member.gender), 'ظروف العمل': safeCell(member.work_conditions),
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet['!dir'] = 'rtl';
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'أعضاء وصلة');
  XLSX.writeFile(workbook, `wasla-members-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function safeCell(value: string | null) {
  const text = clean(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}
