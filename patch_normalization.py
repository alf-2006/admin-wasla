import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update memberToRow
old_member_to_row = """    function memberToRow(m) {
      return {
        full_name: m.fullName,
        team: m.team,
        course_status: m.courseStatus,
        task_status: m.taskStatus,
        deadline: m.deadline || null,
        task_finish_date: m.taskFinishDate || null,
        completion_rank: m.completionRank || 0,
        team_notes: m.teamNotes || "",
        has_laptop: !!m.hasLaptop,
        can_go_alexandria: !!m.canGoAlexandria,
        residence: m.residence || "",
        work_conditions: m.workConditions || "",
        bio: m.bio || ""
      };
    }"""
new_member_to_row = """    function memberToRow(m) {
      return {
        full_name: m.fullName,
        team: m.team,
        course_status: m.courseStatus,
        task_status: m.taskStatus,
        deadline: m.deadline || null,
        task_finish_date: m.taskFinishDate || null,
        completion_rank: m.completionRank || 0,
        team_notes: m.teamNotes || "",
        has_laptop: !!m.hasLaptop,
        can_go_alexandria: !!m.canGoAlexandria,
        residence: m.residence || "",
        work_conditions: m.workConditions || "",
        bio: m.bio || "",
        phone: m.phone || "",
        device: m.device || "Laptop",
        gender: m.gender || "ذكر",
        meeting_attendance: m.meetingAttendance || "Yes",
        work_status: m.workStatus || "مستمر",
        bonus_points: m.bonusPoints || "{}"
      };
    }"""
text = text.replace(old_member_to_row, new_member_to_row)

# 2. Update rowToMember
old_row_to_member = """    function rowToMember(r) {
      return normalizeMember({
        id: r.id, fullName: r.full_name, team: r.team, courseStatus: r.course_status,
        taskStatus: r.task_status, deadline: r.deadline || "", taskFinishDate: r.task_finish_date || "",
        completionRank: r.completion_rank || 0, teamNotes: r.team_notes || "",
        hasLaptop: r.has_laptop, canGoAlexandria: r.can_go_alexandria,
        residence: r.residence || "", workConditions: r.work_conditions || "", bio: r.bio || ""
      });
    }"""
new_row_to_member = """    function rowToMember(r) {
      return normalizeMember({
        id: r.id, fullName: r.full_name, team: r.team, courseStatus: r.course_status,
        taskStatus: r.task_status, deadline: r.deadline || "", taskFinishDate: r.task_finish_date || "",
        completionRank: r.completion_rank || 0, teamNotes: r.team_notes || "",
        hasLaptop: r.has_laptop, canGoAlexandria: r.can_go_alexandria,
        residence: r.residence || "", workConditions: r.work_conditions || "", bio: r.bio || "",
        phone: r.phone || "", device: r.device || "Laptop", gender: r.gender || "ذكر",
        meetingAttendance: r.meeting_attendance || "Yes", workStatus: r.work_status || "مستمر",
        bonusPoints: r.bonus_points || "{}"
      });
    }"""
text = text.replace(old_row_to_member, new_row_to_member)

# 3. Update normalizeMember
old_normalize_member = """    function normalizeMember(x) {
      return {
        id: x.id, fullName: x.fullName || "", team: "Wasla",
        courseStatus: x.courseStatus || "Not Started", taskStatus: x.taskStatus || "Not Started",
        deadline: x.deadline || "", taskFinishDate: x.taskFinishDate || "",
        completionRank: x.completionRank || 0, teamNotes: x.teamNotes || "",
        hasLaptop: x.hasLaptop !== undefined ? !!x.hasLaptop : true,
        canGoAlexandria: x.canGoAlexandria !== undefined ? !!x.canGoAlexandria : false,
        residence: x.residence || "", workConditions: x.workConditions || "", bio: x.bio || ""
      };
    }"""
new_normalize_member = """    function normalizeMember(x) {
      const bPoints = typeof x.bonusPoints === 'string' ? x.bonusPoints : JSON.stringify(x.bonusPoints || {});
      const parsedBonus = (function() { try { return JSON.parse(bPoints) || {}; } catch(e) { return {}; }})();
      let tBonus = 0;
      for (const k in parsedBonus) { tBonus += (parsedBonus[k] || 0); }
      return {
        id: x.id, fullName: x.fullName || "", team: "Wasla",
        courseStatus: x.courseStatus || "Not Started", taskStatus: x.taskStatus || "Not Started",
        deadline: x.deadline || "", taskFinishDate: x.taskFinishDate || "",
        completionRank: x.completionRank || 0, teamNotes: x.teamNotes || "",
        hasLaptop: x.hasLaptop !== undefined ? !!x.hasLaptop : true,
        canGoAlexandria: x.canGoAlexandria !== undefined ? !!x.canGoAlexandria : false,
        residence: x.residence || "", workConditions: x.workConditions || "", bio: x.bio || "",
        phone: x.phone || "", device: x.device || "Laptop", gender: x.gender || "ذكر",
        meetingAttendance: x.meetingAttendance || "Yes", workStatus: x.workStatus || "مستمر",
        bonusPoints: bPoints, totalBonus: tBonus
      };
    }"""
text = text.replace(old_normalize_member, new_normalize_member)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updates applied.")
