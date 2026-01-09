<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  file: File
});

const emit = defineEmits(['frames-ready']);

const videoRef = ref(null);
const frames = ref([]);
const isProcessing = ref(false);
const progress = ref(0);

const extractFrames = async () => {
  if (!props.file || isProcessing.value) return;
  
  isProcessing.value = true;
  progress.value = 0;
  frames.value = [];
  
  const video = videoRef.value;
  const url = URL.createObjectURL(props.file);
  video.src = url;
  
  await new Promise(resolve => video.onloadedmetadata = resolve);
  
  const duration = video.duration;
  // LINE dynamic stickers are max 4 seconds. We'll capture at 10fps.
  const fps = 10;
  const totalFrames = Math.min(Math.floor(duration * fps), 40); // Max 40 frames (4s @ 10fps)
  
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  
  for (let i = 0; i < totalFrames; i++) {
    video.currentTime = i / fps;
    await new Promise(resolve => video.onseeked = resolve);
    
    ctx.drawImage(video, 0, 0);
    
    // Save as blob or dataURL
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = canvas.width;
    frameCanvas.height = canvas.height;
    frameCanvas.getContext('2d').drawImage(canvas, 0, 0);
    frames.value.push(frameCanvas);
    
    progress.value = Math.round(((i + 1) / totalFrames) * 100);
  }
  
  isProcessing.value = false;
  emit('frames-ready', frames.value);
  URL.revokeObjectURL(url);
};

onMounted(() => {
  if (props.file && props.file.type.startsWith('video/')) {
    extractFrames();
  }
});
</script>

<template>
  <div class="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl">
    <video ref="videoRef" class="hidden" muted></video>
    
    <div v-if="isProcessing" class="flex flex-col items-center">
      <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-4">
        <div class="bg-green-500 h-full transition-all duration-300" :style="{ width: progress + '%' }"></div>
      </div>
      <p class="text-sm font-medium">擷取影格中... {{ progress }}%</p>
    </div>
    
    <div v-else class="grid grid-cols-5 md:grid-cols-8 gap-2 max-h-60 overflow-y-auto p-2">
      <div v-for="(frame, idx) in frames" :key="idx" class="aspect-square bg-black rounded shadow-sm overflow-hidden">
         <img :src="frame.toDataURL()" class="w-full h-full object-cover" />
      </div>
    </div>
  </div>
</template>
