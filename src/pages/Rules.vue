<template>
  <div class="flex flex-col items-center justify-center min-h-[80vh] bg-lexio-bg py-8">
    <div class="bg-lexio-bg-light rounded-xl shadow-lg p-8 w-full max-w-4xl border border-gray-600">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-3xl font-bold text-lexio-text">렉시오 게임 규칙</h2>
        <router-link 
          to="/" 
          class="bg-highlight-red text-white font-bold rounded-lg px-6 py-2 transition hover:bg-highlight-red-dark"
        >
          홈으로 돌아가기
        </router-link>
      </div>
      
      <div class="grid md:grid-cols-2 gap-8">
        <div>
          <h3 class="text-xl font-bold text-highlight-red mb-4">기본 규칙</h3>
          <ul class="list-disc list-inside text-lexio-text-muted space-y-3 text-left">
            <li>각 플레이어는 12장의 카드를 받습니다.</li>
            <li>턴마다 한 번씩 카드를 낼 수 있습니다.</li>
            <li>카드 조합(족보)에는 싱글, 페어, 트리플, 스트레이트, 풀하우스 등이 있습니다.</li>
            <li>상대방의 족보보다 높은 족보로만 낼 수 있습니다.</li>
            <li>모든 카드를 먼저 소진하면 승리합니다.</li>
          </ul>
        </div>
        
        <div>
          <h3 class="text-xl font-bold text-highlight-red mb-4">카드 조합 (족보)</h3>
          <ul class="list-disc list-inside text-lexio-text-muted space-y-3 text-left">
            <li><strong>싱글:</strong> 단일 카드 (A, 2, 3, ..., K)</li>
            <li><strong>페어:</strong> 같은 숫자 2장 (AA, 22, 33, ...)</li>
            <li><strong>트리플:</strong> 같은 숫자 3장 (AAA, 222, 333, ...)</li>
            <li><strong>스트레이트:</strong> 연속된 숫자 5장 (A-2-3-4-5, 2-3-4-5-6, ...)</li>
            <li><strong>풀하우스:</strong> 트리플 + 페어 (AAA-22, 222-33, ...)</li>
            <li><strong>포카드:</strong> 같은 숫자 4장 (AAAA, 2222, ...)</li>
            <li><strong>파이브카드:</strong> 같은 숫자 5장 (AAAAA, 22222, ...)</li>
          </ul>
        </div>
      </div>
      
      <div class="mt-8 p-4 bg-lexio-bg rounded-lg border border-gray-600">
        <h3 class="text-lg font-bold text-highlight-red mb-2">게임 진행</h3>
        <p class="text-lexio-text-muted">
          게임은 3-5명의 플레이어가 참여할 수 있으며, 방을 생성하거나 기존 방에 입장하여 게임을 시작할 수 있습니다. 
          모든 플레이어가 준비되면 게임이 시작되고, 카드를 받아 전략적으로 플레이하여 승리를 노려보세요!
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
// Rules 컴포넌트 로직
</script> 