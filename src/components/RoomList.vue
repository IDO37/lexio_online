<template>
  <div class="bg-lexio-bg-lighter rounded-xl shadow-md p-4 flex flex-col gap-2 w-full max-w-md mx-auto">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
      <div class="text-sm text-lexio-text-muted font-semibold">방 목록</div>
      <label class="flex items-center gap-2 text-xs text-lexio-text-muted">
        <input 
          type="checkbox" 
          v-model="showPasswordRooms" 
          class="accent-highlight-red"
        />
        비밀번호 방 표시
      </label>
    </div>
    <div v-if="!isAuthed" class="text-xs text-highlight-red mb-2">로그인해야 방 생성/입장이 가능합니다.</div>
    <div v-if="loading" class="text-center text-lexio-text-muted py-8">불러오는 중...</div>
    <div v-else-if="error" class="text-center text-red-400 py-8">{{ error }}</div>
    <div v-else class="flex flex-col gap-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
      <div
        v-for="room in filteredRooms"
        :key="room.id"
        class="flex items-center justify-between p-3 rounded-lg bg-lexio-bg hover:bg-lexio-bg-light transition cursor-pointer focus-within:ring-2 focus-within:ring-highlight-red"
        tabindex="0"
        @keydown.enter="joinRoom(room)"
        :aria-label="`${room.name} 방, ${room.players}명, ${room.status === 'playing' ? '진행중' : '대기중'}`"
      >
        <div class="flex items-center gap-3">
          <span class="font-bold text-lexio-text text-base">{{ room.name }}</span>
          <span class="text-xs text-lexio-text-muted">({{ room.players }}/{{ room.max_players || 4 }})</span>
          <span v-if="room.status === 'playing'" class="ml-2 text-xs text-highlight-red">진행중</span>
          <span v-else class="ml-2 text-xs text-green-400">대기중</span>
          <span v-if="!room.is_public" class="ml-2 text-xs text-red-400">🔒</span>
        </div>
        <button
          class="bg-highlight-red text-white font-semibold rounded-xl px-4 py-2 text-base shadow-md transition hover:bg-highlight-red-dark focus:outline-none focus:ring-2 focus:ring-highlight-red disabled:opacity-50"
          @click.stop="joinRoom(room)"
          :disabled="!isAuthed"
          aria-label="{{ room.name }} 방 입장"
        >입장</button>
      </div>
      <div v-if="filteredRooms.length === 0" class="text-center text-lexio-text-muted py-8">
        {{ search ? '검색 결과가 없습니다.' : '생성된 방이 없습니다.' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/auth.js'
import { useRouter } from 'vue-router'

const props = defineProps({
  search: {
    type: String,
    default: ''
  }
})

const auth = useAuthStore()
const rooms = ref([])
const loading = ref(false)
const error = ref('')
const router = useRouter()
const showPasswordRooms = ref(false)

const isAuthed = computed(() => !!auth.user)

// 검색 및 비밀번호 방 필터링된 방 목록
const filteredRooms = computed(() => {
  let filtered = rooms.value
  
  // 비밀번호 방 필터링
  if (!showPasswordRooms.value) {
    filtered = filtered.filter(room => room.is_public !== false)
  }
  
  // 검색 필터링
  if (props.search) {
    filtered = filtered.filter(room => 
      room.name.toLowerCase().includes(props.search.toLowerCase())
    )
  }
  
  return filtered
})

// 실시간 구독
let roomsSubscription = null
let pollTimer = null;

async function fetchRooms() {
  loading.value = true
  error.value = ''
  const { data, error: err } = await supabase
    .from('lo_rooms')
    .select('*')
    .order('created_at', { ascending: false })
  if (err) {
    error.value = '방 목록을 불러오지 못했습니다.'
    rooms.value = []
  } else {
    rooms.value = data || []
  }
  loading.value = false
}

function setupRealtimeSubscription() {
  roomsSubscription = supabase
    .channel('rooms-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'lo_rooms'
    }, (payload) => {
      if (payload.eventType === 'INSERT') {
        // 새 방이 생성된 경우
        rooms.value.unshift(payload.new)
      } else if (payload.eventType === 'UPDATE') {
        // 방 정보가 업데이트된 경우
        const index = rooms.value.findIndex(r => r.id === payload.new.id)
        if (index !== -1) {
          rooms.value[index] = payload.new
        }
      } else if (payload.eventType === 'DELETE') {
        // 방이 삭제된 경우
        rooms.value = rooms.value.filter(r => r.id !== payload.old.id)
      }
    })
    .subscribe()
}

onMounted(() => {
  fetchRooms();
  setupRealtimeSubscription();

  // 폴백 폴링 (3초 간격)
  pollTimer = setInterval(fetchRooms, 3000);

  // 탭 재진입 시 한 번 갱신
  document.addEventListener('visibilitychange', onVis);
});

onUnmounted(() => {
  if (roomsSubscription) roomsSubscription.unsubscribe();
  if (pollTimer) clearInterval(pollTimer);
  document.removeEventListener('visibilitychange', onVis);
});

function onVis() {
  if (document.visibilityState === 'visible') fetchRooms();
}

async function joinRoom(room) {
  if (!isAuthed.value) {
    alert('로그인 후 입장할 수 있습니다.');
    return;
  }

  // 비밀번호 확인
  if (!room.is_public && room.password) {
    const password = prompt('비밀번호를 입력하세요:');
    if (!password || password !== room.password) {
      alert('비밀번호가 올바르지 않습니다.');
      return;
    }
  }

  try {
    console.log('[joinRoom] start', { roomId: room.id, userId: auth.user.id });

    // 1) 멤버십 업서트 (중복 무시)
    const { error: upsertErr } = await supabase
      .from('lo_room_players')
      .upsert(
        [{ room_id: room.id, user_id: auth.user.id, joined_at: new Date().toISOString() }],
        { onConflict: 'room_id,user_id', ignoreDuplicates: true }
      )
      .select('room_id, user_id') // RLS에 막히면 여기서 즉시 에러 확인 가능
      .single();

    if (upsertErr) {
      console.error('[joinRoom] upsert error', upsertErr);
      alert('방 입장 실패: ' + upsertErr.message);
      return;
    }
    console.log('[joinRoom] upsert done');

    // 2) 멤버십 가시성 확인 (RLS 포함해서 실제로 보이는지 5회 재시도)
    let memberOk = false;
    for (let i = 0; i < 5; i++) {
      const { data: memberRow, error: memberErr } = await supabase
        .from('lo_room_players')
        .select('room_id')
        .eq('room_id', room.id)
        .eq('user_id', auth.user.id)
        .maybeSingle();
      if (memberErr) console.warn('[joinRoom] membership check err', memberErr);
      if (memberRow?.room_id) { memberOk = true; break; }
      await new Promise(r => setTimeout(r, 150));
    }
    if (!memberOk) {
      console.warn('[joinRoom] membership not visible yet (RLS?)');
      // 계속 진행은 하지만, 아래 room SELECT 재시도에서 최종 판단
    }

    // 3) 방 SELECT 가시성 확보까지 재시도 (최대 8회)
    let ok = false;
    let lastErr = null;
    for (let i = 0; i < 8; i++) {
      const { data, error } = await supabase
        .from('lo_rooms')
        .select('id,status,created_by,players,is_public')
        .eq('id', room.id)
        .maybeSingle();

      if (error) {
        lastErr = error;
        console.warn('[joinRoom] room select err', error);
      }
      if (data?.id) { ok = true; break; }
      await new Promise(r => setTimeout(r, 200));
    }

    if (!ok) {
      console.error('[joinRoom] room still not visible', lastErr);
      alert('방 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    // 4) (선택) 플레이어 수 동기화 — 실패해도 진행
    try {
      const { count, error: cntErr } = await supabase
        .from('lo_room_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id);
      if (!cntErr && typeof count === 'number') {
        const { error: updErr } = await supabase
          .from('lo_rooms')
          .update({ players: count })
          .eq('id', room.id);
        if (updErr) console.warn('[joinRoom] players count update err', updErr);
      } else if (cntErr) {
        console.warn('[joinRoom] count err', cntErr);
      }
    } catch (e) {
      console.warn('[joinRoom] count sync failed', e);
    }

    // 5) 라우팅
    console.log('[joinRoom] navigate to room', room.id);
    router.push(`/game/${room.id}`);
  } catch (err) {
    console.error('방 입장 중 오류:', err);
    alert('방 입장 중 오류가 발생했습니다.');
  }
}

</script>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
}
.scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
  background: #4b5563;
}
.scrollbar-track-gray-800::-webkit-scrollbar-track {
  background: #1f2937;
}
</style> 