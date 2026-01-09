<script setup>
import { ref, watch, onMounted } from 'vue';
import { removeColorGlobal, floodFill, encodeAPNG, resizeCanvas } from '../utils/imageProcess';

const props = defineProps({
  frames: Array,
  tolerance: Number,
  removalMode: String,
  pickX: Number,
  pickY: Number,
  outWidth: Number,
  outHeight: Number,
  frameDelay: Number,
  targetDuration: Number,
  loopCount: Number
});

const emit = defineEmits([
    'update:tolerance', 
    'update:removalMode', 
    'update:pick', 
    'update:outWidth', 
    'update:outHeight',
    'update:frameDelay',
    'update:targetDuration',
    'update:loopCount'
]);

const processedFrames = ref([]);
const previewUrl = ref('');
const fileSize = ref(0);

const applyProcess = () => {
    if (!props.frames || props.frames.length === 0) return;
    
    // 1. Calculate how many frames we SHOULD have based on user settings
    // Requirement: 5-20 frames. Target duration: targetDuration (s). Delay: frameDelay (ms).
    let targetCount = Math.floor((props.targetDuration * 1000) / props.frameDelay);
    targetCount = Math.max(5, Math.min(20, targetCount)); // Clamp to 5-20 frames
    
    // 2. Sample from the input frames
    const sourceFrames = props.frames;
    const sampledSource = [];
    if (sourceFrames.length <= targetCount) {
        // If we have fewer frames than needed, use all of them (they will just play faster or we'd need to duplicate)
        // For now, let's just use what we have to avoid artificial stutter.
        sampledSource.push(...sourceFrames);
    } else {
        // Step-based sampling
        for (let i = 0; i < targetCount; i++) {
            const index = Math.floor(i * (sourceFrames.length / targetCount));
            sampledSource.push(sourceFrames[index]);
        }
    }
    
    // 3. Process the sampled frames (resize + background removal)
    const firstFrame = sampledSource[0];
    const tempCanvas = resizeCanvas(firstFrame, props.outWidth, props.outHeight);
    const tempCtx = tempCanvas.getContext('2d');
    const px = Math.max(0, Math.min(props.pickX, props.outWidth - 1));
    const py = Math.max(0, Math.min(props.pickY, props.outHeight - 1));
    const pickingPixel = tempCtx.getImageData(px, py, 1, 1).data;
    const targetR = pickingPixel[0];
    const targetG = pickingPixel[1];
    const targetB = pickingPixel[2];
    
    processedFrames.value = sampledSource.map(frame => {
        const resized = resizeCanvas(frame, props.outWidth, props.outHeight);
        const ctx = resized.getContext('2d');
        const imageData = ctx.getImageData(0, 0, resized.width, resized.height);
        
        if (props.removalMode === 'global') {
          removeColorGlobal(imageData, targetR, targetG, targetB, props.tolerance);
        } else {
          floodFill(imageData, px, py, props.tolerance);
        }
        
        ctx.putImageData(imageData, 0, 0);
        return resized;
    });
    
    generatePreview();
};

const onPreviewClick = (event) => {
    const img = event.target;
    const rect = img.getBoundingClientRect();
    // Scale click to internal canvas dimensions
    const x = Math.floor((event.clientX - rect.left) * (props.outWidth / rect.width));
    const y = Math.floor((event.clientY - rect.top) * (props.outHeight / rect.height));
    
    emit('update:pick', { x: Math.min(x, props.outWidth - 1), y: Math.min(y, props.outHeight - 1) });
};

const generatePreview = () => {
    if (processedFrames.value.length === 0) return;
    const apngBuffer = encodeAPNG(processedFrames.value, props.frameDelay, props.loopCount);
    if (apngBuffer) {
        fileSize.value = apngBuffer.byteLength;
        const blob = new Blob([apngBuffer], { type: 'image/png' });
        if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
        previewUrl.value = URL.createObjectURL(blob);
    }
};

const download = () => {
    if (!previewUrl.value) return;
    const a = document.createElement('a');
    a.href = previewUrl.value;
    a.download = `line-sticker-${Date.now()}.png`;
    a.click();
};

onMounted(applyProcess);
watch(() => [
    props.frames, 
    props.tolerance, 
    props.removalMode, 
    props.pickX, 
    props.pickY, 
    props.outWidth, 
    props.outHeight,
    props.frameDelay,
    props.targetDuration,
    props.loopCount
], applyProcess, { deep: true });

</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="bg-slate-100 dark:bg-slate-900 rounded-xl p-8 flex items-center justify-center min-h-[300px] border-2 border-dashed border-slate-300 dark:border-slate-700 relative overflow-hidden">
      <div v-if="previewUrl" class="text-center group relative cursor-crosshair">
        <img :src="previewUrl" @click="onPreviewClick" class="max-w-full h-auto shadow-2xl rounded-lg bg-checkerboard" />
        
        <!-- Pick Indicator -->
        <div 
            class="absolute w-6 h-6 border-4 border-white rounded-full shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            :style="{ left: (pickX / outWidth * 100) + '%', top: (pickY / outHeight * 100) + '%' }"
        >
          <div class="w-1 h-1 bg-red-500 rounded-full"></div>
        </div>

        <p class="mt-4 text-xs text-slate-400 font-bold uppercase tracking-widest">點擊影像任一處選取去背顏色</p>
      </div>
      <div v-else class="text-slate-400 animate-pulse font-bold">
        處理中，請稍候...
      </div>
    </div>

    <div class="space-y-6">
      <!-- Dimensions Section -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-xs font-bold opacity-60 uppercase tracking-tighter block mb-2">輸出寬度 (px)</label>
          <input 
            type="number" 
            :value="outWidth" 
            @input="$emit('update:outWidth', Number($event.target.value))"
            class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-sm font-bold"
          >
        </div>
        <div>
          <label class="text-xs font-bold opacity-60 uppercase tracking-tighter block mb-2">輸出高度 (px)</label>
          <input 
            type="number" 
            :value="outHeight" 
            @input="$emit('update:outHeight', Number($event.target.value))"
            class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-sm font-bold"
          >
        </div>
      </div>

      <!-- APNG Constraints Section -->
      <div class="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-bold opacity-60 uppercase block mb-1">影格間隔 (ms)</label>
              <input 
                type="number" 
                :value="frameDelay" 
                @input="$emit('update:frameDelay', Number($event.target.value))"
                class="w-full bg-white dark:bg-slate-700 border-none rounded-lg p-2 text-sm font-bold"
              >
            </div>
            <div>
              <label class="text-xs font-bold opacity-60 uppercase block mb-1">目標總秒數 (s)</label>
              <input 
                type="number" 
                step="0.1"
                :value="targetDuration" 
                @input="$emit('update:targetDuration', Number($event.target.value))"
                class="w-full bg-white dark:bg-slate-700 border-none rounded-lg p-2 text-sm font-bold"
              >
            </div>
            <div>
              <label class="text-xs font-bold opacity-60 uppercase block mb-1">循環次數 (0=無限)</label>
              <select 
                :value="loopCount" 
                @change="$emit('update:loopCount', Number($event.target.value))"
                class="w-full bg-white dark:bg-slate-700 border-none rounded-lg p-2 text-sm font-bold"
              >
                <option :value="0">無限循環</option>
                <option :value="1">1 次</option>
                <option :value="2">2 次</option>
                <option :value="3">3 次</option>
                <option :value="4">4 次</option>
              </select>
            </div>
          </div>

          <!-- Status / Validation Info -->
          <div class="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-tighter">
            <div 
                class="px-2 py-1 rounded-md flex items-center gap-1"
                :class="processedFrames.length >= 5 && processedFrames.length <= 20 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'"
            >
                <div class="w-1.5 h-1.5 rounded-full bg-current"></div>
                影格數: {{ processedFrames.length }} / 20
            </div>
            <div class="px-2 py-1 bg-blue-100 text-blue-600 rounded-md flex items-center gap-1">
                <div class="w-1.5 h-1.5 rounded-full bg-current"></div>
                時長: {{ (processedFrames.length * frameDelay / 1000).toFixed(2) }}s
            </div>
            <div 
                class="px-2 py-1 rounded-md flex items-center gap-1"
                :class="fileSize < 1024 * 1024 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'"
            >
                <div class="w-1.5 h-1.5 rounded-full bg-current"></div>
                大小: {{ (fileSize / 1024).toFixed(1) }}KB
            </div>
          </div>
          <p v-if="fileSize > 1024 * 1024" class="text-[10px] text-red-500 font-bold italic">* 檔案超過 1MB，建議縮小尺寸或減少影格</p>
      </div>

      <div class="flex p-1 bg-slate-200 dark:bg-slate-700 rounded-xl">
          <button 
            @click="$emit('update:removalMode', 'global')"
            :class="removalMode === 'global' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-500'"
            class="flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all"
          >全域移除</button>
          <button 
            @click="$emit('update:removalMode', 'flood')"
            :class="removalMode === 'flood' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-500'"
            class="flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all"
          >魔術棒 (Flood Fill)</button>
      </div>

      <div>
        <div class="flex justify-between mb-2">
            <label class="text-sm font-bold opacity-70">去背強度 (Tolerance)</label>
            <span class="text-sm font-mono">{{ tolerance }}</span>
        </div>
        <input 
            type="range" 
            :value="tolerance" 
            @input="$emit('update:tolerance', Number($event.target.value))"
            min="0" max="255" 
            class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-500"
        >
      </div>

      <button 
        @click="download"
        class="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        下載 APNG
      </button>
    </div>
  </div>
</template>


<style scoped>
.bg-checkerboard {
    background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}
</style>
