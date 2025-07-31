-- 렉시오 온라인 게임을 위한 Supabase 스키마

-- 1. lo_rooms: 게임 방 목록
CREATE TABLE IF NOT EXISTS lo_rooms (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'waiting', -- waiting, playing, finished
  created_by UUID REFERENCES auth.users(id),
  players INTEGER DEFAULT 0,
  max_players INTEGER DEFAULT 4,
  is_public BOOLEAN DEFAULT true,
  password TEXT
);
COMMENT ON TABLE lo_rooms IS '게임 대기방 목록';

-- 2. lo_room_players: 방에 참여한 플레이어
CREATE TABLE IF NOT EXISTS lo_room_players (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT REFERENCES lo_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);
COMMENT ON TABLE lo_room_players IS '각 방에 참여한 플레이어 목록';

-- 3. lo_games: 진행된 게임 정보
CREATE TABLE IF NOT EXISTS lo_games (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT REFERENCES lo_rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'playing', -- playing, finished
  winner_id UUID REFERENCES auth.users(id),
  current_turn_user_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id)
);
COMMENT ON TABLE lo_games IS '실제 게임 진행 정보';

-- 4. lo_cards: 게임에서 사용되는 카드
CREATE TABLE IF NOT EXISTS lo_cards (
  id BIGSERIAL PRIMARY KEY,
  game_id BIGINT REFERENCES lo_games(id) ON DELETE CASCADE,
  owner_id UUID, -- CPU 플레이어의 경우 NULL이 될 수 있음
  suit TEXT NOT NULL, -- sun, moon, star, cloud
  rank TEXT NOT NULL, -- 1-15
  in_hand BOOLEAN DEFAULT true
);
COMMENT ON TABLE lo_cards IS '게임별로 분배된 카드 정보';

-- 5. lo_game_turns: 게임 턴 기록
CREATE TABLE IF NOT EXISTS lo_game_turns (
  id BIGSERIAL PRIMARY KEY,
  game_id BIGINT REFERENCES lo_games(id) ON DELETE CASCADE,
  player_id UUID,
  action TEXT NOT NULL, -- play, pass
  cards JSONB,
  combo_type TEXT,
  combo_value INTEGER,
  turn_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE lo_game_turns IS '게임의 각 턴 진행 기록';

-- 6. lo_stats: 유저별 전적
CREATE TABLE IF NOT EXISTS lo_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE lo_stats IS '플레이어별 전적 통계';

-- RLS 정책 (기존 정책 포함하여 재정의)
ALTER TABLE lo_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view public rooms" ON lo_rooms;
CREATE POLICY "Users can view public rooms" ON lo_rooms FOR SELECT USING (is_public = true OR created_by = auth.uid());
DROP POLICY IF EXISTS "Users can create rooms" ON lo_rooms;
CREATE POLICY "Users can create rooms" ON lo_rooms FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Room creators can update their rooms" ON lo_rooms;
CREATE POLICY "Room creators can update their rooms" ON lo_rooms FOR UPDATE USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Room creators can delete their rooms" ON lo_rooms;
CREATE POLICY "Room creators can delete their rooms" ON lo_rooms FOR DELETE USING (auth.uid() = created_by);

ALTER TABLE lo_room_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view room players" ON lo_room_players;
CREATE POLICY "Users can view room players" ON lo_room_players FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert themselves into rooms" ON lo_room_players;
CREATE POLICY "Users can insert themselves into rooms" ON lo_room_players FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete themselves from rooms" ON lo_room_players;
CREATE POLICY "Users can delete themselves from rooms" ON lo_room_players FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE lo_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can view games they are in" ON lo_games FOR SELECT USING (EXISTS (SELECT 1 FROM lo_room_players WHERE room_id = lo_games.room_id AND user_id = auth.uid()));

ALTER TABLE lo_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can view their own cards" ON lo_cards FOR SELECT USING (owner_id = auth.uid());

ALTER TABLE lo_game_turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can view game turns" ON lo_game_turns FOR SELECT USING (EXISTS (SELECT 1 FROM lo_games WHERE id = lo_game_turns.game_id));

ALTER TABLE lo_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all stats" ON lo_stats FOR SELECT USING (true);
CREATE POLICY "Users can manage their own stats" ON lo_stats FOR ALL USING (auth.uid() = user_id);

-- RPC 함수: 랭킹 조회
CREATE OR REPLACE FUNCTION get_lexio_ranking()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  wins INTEGER,
  losses INTEGER,
  total_games INTEGER,
  win_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.user_id,
    u.email,
    s.wins,
    s.losses,
    s.total_games,
    CASE
      WHEN s.total_games > 0 THEN (s.wins::NUMERIC / s.total_games)
      ELSE 0
    END AS win_rate
  FROM
    lo_stats s
  JOIN
    auth.users u ON s.user_id = u.id
  ORDER BY
    s.wins DESC, win_rate DESC, s.total_games DESC;
END;
$$ LANGUAGE plpgsql;