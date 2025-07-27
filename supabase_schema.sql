-- lo_rooms 테이블에 필요한 컬럼 추가
ALTER TABLE lo_rooms 
ADD COLUMN IF NOT EXISTS players INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS password TEXT;

-- lo_room_players 테이블이 없다면 생성
CREATE TABLE IF NOT EXISTS lo_room_players (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT REFERENCES lo_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- RLS 정책 추가
ALTER TABLE lo_room_players ENABLE ROW LEVEL SECURITY;

-- lo_room_players 테이블에 대한 정책
CREATE POLICY "Users can view room players" ON lo_room_players
  FOR SELECT USING (true);

CREATE POLICY "Users can insert themselves into rooms" ON lo_room_players
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete themselves from rooms" ON lo_room_players
  FOR DELETE USING (auth.uid() = user_id);

-- lo_rooms 테이블에 대한 정책 (필요한 경우)
CREATE POLICY "Users can view public rooms" ON lo_rooms
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create rooms" ON lo_rooms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update their rooms" ON lo_rooms
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Room creators can delete their rooms" ON lo_rooms
  FOR DELETE USING (auth.uid() = created_by); 