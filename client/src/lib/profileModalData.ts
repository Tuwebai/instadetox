import type { supabase as supabaseClient } from "@/lib/supabase";

export interface ProfileModalCommentRecord {
  id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  likes_count: number;
  liked_by_me: boolean;
}

export interface ModalCommentsCursorRecord {
  oldestCreatedAt: string;
  oldestId: string;
}

interface RawCommentRow {
  id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
}

const mapCommentsWithProfilesAndLikes = async ({
  client,
  rows,
  userId,
}: {
  client: NonNullable<typeof supabaseClient>;
  rows: RawCommentRow[];
  userId?: string | null;
}): Promise<ProfileModalCommentRecord[]> => {
  if (rows.length === 0) return [];

  const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
  const commentIds = rows.map((row) => row.id);

  const { data: profilesData } = await client
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", userIds);

  const likesCountPromise = client.from("comment_likes").select("comment_id").in("comment_id", commentIds);
  const myCommentLikesPromise =
    userId && commentIds.length > 0
      ? client.from("comment_likes").select("comment_id").eq("user_id", userId).in("comment_id", commentIds)
      : Promise.resolve({ data: [], error: null });

  const [likesCountRes, myLikesRes] = await Promise.all([likesCountPromise, myCommentLikesPromise]);
  const likesByCommentId = new Map<string, number>();
  (likesCountRes.data ?? []).forEach((row) => {
    const key = row.comment_id as string;
    likesByCommentId.set(key, (likesByCommentId.get(key) ?? 0) + 1);
  });
  const likedByMeSet = new Set((myLikesRes.data ?? []).map((row) => row.comment_id as string));

  const profileMap = new Map((profilesData ?? []).map((profile) => [profile.id as string, profile]));

  return rows.map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      id: row.id,
      user_id: row.user_id,
      parent_id: row.parent_id ?? null,
      content: row.content,
      created_at: row.created_at,
      username: (profile?.username as string) ?? "usuario",
      full_name: (profile?.full_name as string | null) ?? null,
      avatar_url: (profile?.avatar_url as string | null) ?? null,
      likes_count: likesByCommentId.get(row.id) ?? 0,
      liked_by_me: likedByMeSet.has(row.id),
    };
  });
};

export const fetchModalInitialData = async ({
  client,
  postId,
  commentsPageSize,
  userId,
}: {
  client: NonNullable<typeof supabaseClient>;
  postId: string;
  commentsPageSize: number;
  userId?: string | null;
}) => {
  const commentsPromise = client
    .from("post_comments")
    .select("id, post_id, user_id, parent_id, content, created_at")
    .eq("post_id", postId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(commentsPageSize + 1);

  const likedPromise =
    userId
      ? client.from("post_likes").select("post_id").eq("post_id", postId).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null, error: null });
  const savedPromise =
    userId
      ? client.from("saved_posts").select("post_id").eq("post_id", postId).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null, error: null });

  const [commentsRes, likedRes, savedRes] = await Promise.all([commentsPromise, likedPromise, savedPromise]);

  if (commentsRes.error) {
    return {
      ok: false as const,
      likedByMe: Boolean(likedRes?.data),
      savedByMe: Boolean(savedRes?.data),
    };
  }

  const rawComments = (commentsRes.data ?? []) as RawCommentRow[];
  const hasMore = rawComments.length > commentsPageSize;
  const pageRows = hasMore ? rawComments.slice(0, commentsPageSize) : rawComments;
  const ascRows = [...pageRows].reverse();
  const mapped = await mapCommentsWithProfilesAndLikes({ client, rows: ascRows, userId });
  const oldest = mapped[0] ?? null;

  return {
    ok: true as const,
    likedByMe: Boolean(likedRes?.data),
    savedByMe: Boolean(savedRes?.data),
    comments: mapped,
    hasMore,
    cursor: oldest
      ? ({ oldestCreatedAt: oldest.created_at, oldestId: oldest.id } satisfies ModalCommentsCursorRecord)
      : null,
  };
};

export const fetchOlderModalCommentsData = async ({
  client,
  postId,
  cursor,
  commentsPageSize,
  userId,
}: {
  client: NonNullable<typeof supabaseClient>;
  postId: string;
  cursor: ModalCommentsCursorRecord;
  commentsPageSize: number;
  userId?: string | null;
}) => {
  const { data: rows, error } = await client
    .from("post_comments")
    .select("id, post_id, user_id, parent_id, content, created_at")
    .eq("post_id", postId)
    .is("deleted_at", null)
    .or(`created_at.lt.${cursor.oldestCreatedAt},and(created_at.eq.${cursor.oldestCreatedAt},id.lt.${cursor.oldestId})`)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(commentsPageSize + 1);

  if (error) {
    return { ok: false as const };
  }

  const list = (rows ?? []) as RawCommentRow[];
  const hasMore = list.length > commentsPageSize;
  const pageRows = hasMore ? list.slice(0, commentsPageSize) : list;
  const ascRows = [...pageRows].reverse();
  const mapped = await mapCommentsWithProfilesAndLikes({ client, rows: ascRows, userId });
  const oldest = mapped[0] ?? null;

  return {
    ok: true as const,
    comments: mapped,
    hasMore,
    cursor: oldest
      ? ({ oldestCreatedAt: oldest.created_at, oldestId: oldest.id } satisfies ModalCommentsCursorRecord)
      : cursor,
  };
};

