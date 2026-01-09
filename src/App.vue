<script setup>
import { ref } from 'vue';
import VideoProcessor from './components/VideoProcessor.vue';
import GridCutter from './components/GridCutter.vue';
import VideoCropSelector from './components/VideoCropSelector.vue';
import ImageEditor from './components/ImageEditor.vue';
import BatchExporter from './components/BatchExporter.vue';

const currentStep = ref(1); // 1: Upload, 2: Process, 3: Export
const uploadedFile = ref(null);
const rawFrames = ref([]); // Full size frames from video
const selectedSliceFrames = ref([]); // 1/9 frames
const activeSliceIndex = ref(0);

// Shared Settings for Single Preview & Batch Export
const tolerance = ref(15);
const removalMode = ref('global');
const pickX = ref(0);
const pickY = ref(0);
const outWidth = ref(320);
const outHeight = ref(270);

// APNG Specific Controls
const frameDelay = ref(150); // ms
const targetDuration = ref(3.5); // seconds
const loopCount = ref(0); // 0 = infinite, but LINE wants 1-4. We'll handle mapping.

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    uploadedFile.value = file;
    currentStep.value = 2;
    
    // If it's an image, process it immediately into rawFrames
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          rawFrames.value = [canvas];
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      rawFrames.value = []; // Reset for video processor to take over
    }
  }
};

const onFramesReady = (frames) => {
    rawFrames.value = frames;
};

const onSliceSelected = (data) => {
    selectedSliceFrames.value = data.frames;
    activeSliceIndex.value = data.index;
};

const reset = () => {
  currentStep.value = 1;
  uploadedFile.value = null;
  rawFrames.value = [];
  selectedSliceFrames.value = [];
  tolerance.value = 15;
  removalMode.value = 'global';
  pickX.value = 0;
  pickY.value = 0;
  outWidth.value = 320;
  outHeight.value = 270;
  frameDelay.value = 150;
  targetDuration.value = 3.5;
  loopCount.value = 0;
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-4 md:p-8">
    <header class="max-w-4xl mx-auto mb-12 text-center">
      <h1 class="text-4xl font-extrabold mb-4 bg-gradient-to-r from-green-400 via-emerald-500 to-blue-500 bg-clip-text text-transparent italic">
        LINE Sticker GO!
      </h1>
      <p class="text-slate-500 dark:text-slate-400 font-medium">
        網頁版動態貼圖製作工具 • 本地端運算 • 隱私無憂
      </p>
    </header>

    <main class="max-w-6xl mx-auto">
      <!-- Step 1: Entry Selection -->
      <section v-if="currentStep === 1" class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <!-- Video to APNG -->
        <div class="group relative flex flex-col items-center p-10 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl border-4 border-transparent hover:border-blue-500 transition-all cursor-pointer overflow-hidden" @click="$refs.videoInput.click()">
          <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg class="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
          </div>
          <div class="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform duration-500">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </div>
          <h2 class="text-2xl font-black mb-2">影片轉貼圖</h2>
          <p class="text-slate-400 text-center">上傳 MP4/MOV，自動去背轉 APNG</p>
          <input type="file" ref="videoInput" class="hidden" accept="video/*" @change="handleFileUpload">
        </div>

        <!-- Image Slicing -->
        <div class="group relative flex flex-col items-center p-10 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl border-4 border-transparent hover:border-green-500 transition-all cursor-pointer overflow-hidden" @click="$refs.imageInput.click()">
            <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <svg class="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2zm14 10H7v-2h10v2zm0-4H7V9h10v2z"/></svg>
            </div>
          <div class="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-3xl flex items-center justify-center text-green-500 mb-6 group-hover:scale-110 transition-transform duration-500">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z M4 9h16 M9 4v16 M15 4v16"/></svg>
          </div>
          <h2 class="text-2xl font-black mb-2">九宮格圖片切割</h2>
          <p class="text-slate-400 text-center">將一張大圖切成 9 張 LINE 貼圖尺寸</p>
          <input type="file" ref="imageInput" class="hidden" accept="image/*" @change="handleFileUpload">
        </div>
      </section>

      <!-- Step 2: Editor -->
      <section v-if="currentStep === 2" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center font-bold text-white shadow-lg shadow-green-500/40">1</div>
                <span class="font-bold">{{ uploadedFile && uploadedFile.type.startsWith('video/') ? '影格擷取中...' : '圖片處理中...' }}</span>
            </div>
            <button @click="reset" class="px-4 py-2 text-sm font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-tighter">取消並返回</button>
        </div>

        <VideoProcessor v-if="uploadedFile && uploadedFile.type.startsWith('video/')" :file="uploadedFile" @frames-ready="onFramesReady" />

        <div v-if="rawFrames.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Left: Selector (Grid for Image, Manual for Video) -->
            <div class="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-700">
                <template v-if="uploadedFile && uploadedFile.type.startsWith('image/')">
                    <h3 class="text-xl font-bold mb-6 flex items-center gap-3">
                        <span class="w-2 h-6 bg-blue-500 rounded-full"></span>
                        單圖切分：選擇九宮格區域
                    </h3>
                    <GridCutter :frames="rawFrames" @slice-selected="onSliceSelected" />
                    <p class="mt-4 text-sm text-slate-400 italic">點選任一區塊即可開始編輯該貼圖</p>
                </template>
                <template v-else>
                    <h3 class="text-xl font-bold mb-6 flex items-center gap-3">
                        <span class="w-2 h-6 bg-purple-500 rounded-full"></span>
                        範圍選取：手動設定輸出區域
                    </h3>
                    <VideoCropSelector 
                        :frames="rawFrames" 
                        :initialWidth="outWidth" 
                        :initialHeight="outHeight" 
                        @crop-selected="onSliceSelected" 
                    />
                </template>
            </div>

            <!-- Right: Preview & Adjust -->
            <div v-if="selectedSliceFrames.length > 0" class="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-700">
                <h3 class="text-xl font-bold mb-6 flex items-center gap-3">
                    <span class="w-2 h-6 bg-green-500 rounded-full"></span>
                    細節調整與匯出
                </h3>
                
                <ImageEditor 
                  :frames="selectedSliceFrames" 
                  :key="activeSliceIndex" 
                  v-model:tolerance="tolerance"
                  v-model:removalMode="removalMode"
                  v-model:outWidth="outWidth"
                  v-model:outHeight="outHeight"
                  v-model:frameDelay="frameDelay"
                  v-model:targetDuration="targetDuration"
                  v-model:loopCount="loopCount"
                  :pickX="pickX"
                  :pickY="pickY"
                  @update:pick="(p) => { pickX = p.x; pickY = p.y; }"
                />

                <BatchExporter 
                  v-if="uploadedFile && uploadedFile.type.startsWith('image/')"
                  :rawFrames="rawFrames" 
                  :tolerance="tolerance"
                  :removalMode="removalMode"
                  :pickX="pickX"
                  :pickY="pickY"
                  :outWidth="outWidth"
                  :outHeight="outHeight"
                  :isImage="true"
                />
            </div>
        </div>
      </section>
    </main>
  </div>
</template>



<style>
/* Custom animations or glassmorphism can be added here if needed */
</style>
