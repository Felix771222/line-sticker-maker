<script setup>
import { ref } from 'vue';
import JSZip from 'jszip';
import { removeColorGlobal, floodFill, encodeAPNG, resizeCanvas } from '../utils/imageProcess';

const props = defineProps({
  rawFrames: Array,
  tolerance: Number,
  removalMode: String,
  pickX: Number,
  pickY: Number,
  outWidth: Number,
  outHeight: Number,
  isImage: Boolean
});

const isProcessing = ref(false);
const progress = ref(0);

const getSlicesForIndex = (index, frames) => {
  if (!frames || frames.length === 0) return null;
  
  const width = frames[0].width;
  const height = frames[0].height;
  const sliceW = width / 3;
  const sliceH = height / 3;
  
  const col = index % 3;
  const row = Math.floor(index / 3);
  
  return frames.map(frame => {
    const canvas = document.createElement('canvas');
    canvas.width = sliceW;
    canvas.height = sliceH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(frame, col * sliceW, row * sliceH, sliceW, sliceH, 0, 0, sliceW, sliceH);
    return canvas;
  });
};

const exportAll = async () => {
  if (isProcessing.value) return;
  isProcessing.value = true;
  progress.value = 0;
  
  const zip = new JSZip();
  const total = 9;
  
  // Take a sample from the FIRST slice to determine the target color
  // coordinates are relative to the output dimensions
  const firstSliceSet = getSlicesForIndex(0, props.rawFrames);
  const sampleSliceResized = resizeCanvas(firstSliceSet[0], props.outWidth, props.outHeight);
  const sampleCtx = sampleSliceResized.getContext('2d');
  
  const px = Math.max(0, Math.min(props.pickX, props.outWidth - 1));
  const py = Math.max(0, Math.min(props.pickY, props.outHeight - 1));
  
  const pickingPixel = sampleCtx.getImageData(px, py, 1, 1).data;
  const targetR = pickingPixel[0];
  const targetG = pickingPixel[1];
  const targetB = pickingPixel[2];

  for (let i = 0; i < total; i++) {
    const sliceFrames = getSlicesForIndex(i, props.rawFrames);
    const processedSlices = sliceFrames.map(frame => {
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

    if (props.isImage) {
      // Export as PNG
      const blob = await new Promise(resolve => processedSlices[0].toBlob(resolve, 'image/png'));
      zip.file(`sticker-${i+1}.png`, blob);
    } else {
      // Export as APNG
      const apngBuffer = encodeAPNG(processedSlices, 100);
      if (apngBuffer) {
        zip.file(`sticker-${i+1}.png`, apngBuffer); // Line uses .png extension for APNG
      }
    }
    
    progress.value = Math.round(((i + 1) / total) * 100);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = `line-stickers-${Date.now()}.zip`;
  link.click();
  
  isProcessing.value = false;
};
</script>

<template>
  <div class="mt-8 border-t border-slate-100 dark:border-slate-700 pt-8">
    <button 
      @click="exportAll"
      :disabled="isProcessing"
      class="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-5 rounded-[2rem] shadow-2xl hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 text-lg group"
    >
      <svg v-if="!isProcessing" class="w-6 h-6 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <svg v-else class="animate-spin h-6 w-6 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {{ isProcessing ? `打包中... ${progress}%` : '一鍵下載完整 9 張貼圖 (ZIP)' }}
    </button>
  </div>
</template>
