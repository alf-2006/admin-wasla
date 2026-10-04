import { useMemo } from 'react';
import { useMembers } from '../members/api';
import { useNotes } from '../notes/api';
import { calculateBonus } from '../dashboard/metrics';
import type { RankedMember } from './RankingPodium';

export function useRanking() {
  const membersQuery = useMembers();
  const notesQuery = useNotes();

  const members = membersQuery.data ?? [];
  const notes = notesQuery.data ?? [];

  // Calculate bonus & sort all members
  const rankedAllMembers: RankedMember[] = useMemo(() => {
    const list: RankedMember[] = members.map((m) => ({
      ...m,
      totalBonus: calculateBonus(notes, m.id),
      rank: 0,
    }));

    // Primary: bonus descending, Secondary: completion_rank ascending, Tertiary: created_at
    list.sort((a, b) => {
      if (b.totalBonus !== a.totalBonus) {
        return b.totalBonus - a.totalBonus;
      }
      if (a.completion_rank && b.completion_rank) {
        return a.completion_rank - b.completion_rank;
      }
      if (a.completion_rank) return -1;
      if (b.completion_rank) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return list.map((m, idx) => ({ ...m, rank: idx + 1 }));
  }, [members, notes]);

  const topThree = useMemo(() => rankedAllMembers.slice(0, 3), [rankedAllMembers]);

  const isLoading = membersQuery.isLoading || notesQuery.isLoading;
  const isError = membersQuery.isError || notesQuery.isError;
  const refetch = () => Promise.all([membersQuery.refetch(), notesQuery.refetch()]);

  return {
    members,
    notes,
    rankedAllMembers,
    topThree,
    isLoading,
    isError,
    refetch,
  };
}
