export type Profile = {
  id: string; username: string; display_name: string; avatar_url: string | null; bio: string; created_at: string; equipped_title?: string | null; name_color?: string | null; name_font?: string | null; avatar_cosmetic?: string | null;
};
export type Friendship = { id: string; requester: string; addressee: string; status: string; created_at: string };
export type Message = { id: string; sender: string; receiver: string; content: string; created_at: string };
