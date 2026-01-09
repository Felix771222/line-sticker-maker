<script setup>
import { ref, computed, onMounted, watch } from 'vue';

const props = defineProps({
  source: [HTMLCanvasElement, String],
  frames: Array
});

const emit = defineEmits(['slice-selected']);

const selectedIndex = ref(0);
const baseCanvas = ref(null);

const drawBase = () => {
    if (props.frames && props.frames[0] && baseCanvas.value) {
        const ctx = baseCanvas.value.getContext('2d');
        ctx.drawImage(props.frames[0], 0, 0);
    }
};

onMounted(drawBase);
watch(() => props.frames, drawBase, { deep: true });

const gridStyles = computed(() => {
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    aspectRatio: '1 / 1',
    width: '100%',
    position: 'relative'
  };
});

const getSlice = (index) => {
  if (!props.frames || props.frames.length === 0) return null;
  
  const width = props.frames[0].width;
  const height = props.frames[0].height;
  const sliceW = width / 3;
  const sliceH = height / 3;
  
  const col = index % 3;
  const row = Math.floor(index / 3);
  
  return props.frames.map(frame => {
    const canvas = document.createElement('canvas');
    canvas.width = sliceW;
    canvas.height = sliceH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(frame, col * sliceW, row * sliceH, sliceW, sliceH, 0, 0, sliceW, sliceH);
    return canvas;
  });
};

const selectCell = (idx) => {
    selectedIndex.value = idx;
    const slices = getSlice(idx);
    emit('slice-selected', { index: idx, frames: slices });
};
</script>

<template>
  <div class="relative border-4 border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800">
    <!-- Base Preview -->
    <div class="relative w-full aspect-square">
        <canvas v-if="frames && frames[0]" ref="baseCanvas" class="w-full h-full object-contain" :width="frames[0].width" :height="frames[0].height"></canvas>
        
        <!-- Grid Overlay -->
        <div class="absolute inset-0 grid grid-cols-3 grid-rows-3 cursor-crosshair">
          <div 
            v-for="i in 9" 
            :key="i-1" 
            @click="selectCell(i-1)"
            class="border border-white/30 hover:bg-white/20 transition-colors flex items-center justify-center text-white/50 font-bold"
            :class="{ 'bg-green-500/40 border-green-400 border-2': selectedIndex === i-1 }"
          >
            {{ i }}
          </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
canvas {
    display: block;
    max-width: 100%;
    height: auto;
}
</style>
