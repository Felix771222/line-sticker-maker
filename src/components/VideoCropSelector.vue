<script setup>
import { ref, onMounted, watch, computed } from 'vue';

const props = defineProps({
  frames: Array,
  initialWidth: { type: Number, default: 320 },
  initialHeight: { type: Number, default: 270 }
});

const emit = defineEmits(['crop-selected']);

const baseCanvas = ref(null);
const cropX = ref(0);
const cropY = ref(0);
const cropW = ref(props.initialWidth);
const cropH = ref(props.initialHeight);

const videoDim = ref({ w: 0, h: 0 });
const containerRef = ref(null);

const drawBase = () => {
    if (props.frames && props.frames[0] && baseCanvas.value) {
        const frame = props.frames[0];
        videoDim.value = { w: frame.width, h: frame.height };
        
        // Only set defaults if not already set or out of bounds
        if (cropW.value > frame.width) cropW.value = Math.min(props.initialWidth, frame.width);
        if (cropH.value > frame.height) cropH.value = Math.min(props.initialHeight, frame.height);
        
        const ctx = baseCanvas.value.getContext('2d');
        ctx.drawImage(frame, 0, 0);
    }
};

onMounted(drawBase);
watch(() => props.frames, drawBase, { deep: true });
watch(() => [props.initialWidth, props.initialHeight], () => {
    cropW.value = Math.min(props.initialWidth, videoDim.value.w || 9999);
    cropH.value = Math.min(props.initialHeight, videoDim.value.h || 9999);
});

// Interactive Logic
const isDragging = ref(false);
const isResizing = ref(false);
const startMouse = ref({ x: 0, y: 0 });
const startCrop = ref({ x: 0, y: 0, w: 0, h: 0 });

const startDrag = (e) => {
    isDragging.value = true;
    initInteraction(e);
};

const startResize = (e) => {
    e.stopPropagation();
    isResizing.value = true;
    initInteraction(e);
};

const initInteraction = (e) => {
    startMouse.value = { x: e.clientX, y: e.clientY };
    startCrop.value = { x: cropX.value, y: cropY.value, w: cropW.value, h: cropH.value };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopInteraction);
};

const handleMouseMove = (e) => {
    if (!isDragging.value && !isResizing.value) return;
    if (!containerRef.value) return;

    const rect = containerRef.value.getBoundingClientRect();
    const scaleX = videoDim.value.w / rect.width;
    const scaleY = videoDim.value.h / rect.height;

    const dx = (e.clientX - startMouse.value.x) * scaleX;
    const dy = (e.clientY - startMouse.value.y) * scaleY;

    if (isDragging.value) {
        cropX.value = Math.max(0, Math.min(startCrop.value.x + dx, videoDim.value.w - cropW.value));
        cropY.value = Math.max(0, Math.min(startCrop.value.y + dy, videoDim.value.h - cropH.value));
    } else if (isResizing.value) {
        cropW.value = Math.max(20, Math.min(startCrop.value.w + dx, videoDim.value.w - cropX.value));
        cropH.value = Math.max(20, Math.min(startCrop.value.h + dy, videoDim.value.h - cropY.value));
    }
};

const stopInteraction = () => {
    isDragging.value = false;
    isResizing.value = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', stopInteraction);
};

const confirmCrop = () => {
    if (!props.frames || props.frames.length === 0) return;
    
    const croppedFrames = props.frames.map(frame => {
        const canvas = document.createElement('canvas');
        canvas.width = cropW.value;
        canvas.height = cropH.value;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(frame, cropX.value, cropY.value, cropW.value, cropH.value, 0, 0, cropW.value, cropH.value);
        return canvas;
    });
    
    emit('crop-selected', { frames: croppedFrames });
};

// UI helpers for draggable overlay (simplified for now with inputs)
</script>

<template>
  <div class="space-y-6">
    <div 
        ref="containerRef"
        class="relative border-4 border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-900 cursor-crosshair select-none"
    >
        <canvas 
            v-if="frames && frames[0]" 
            ref="baseCanvas" 
            class="w-full h-auto object-contain blur-[2px] opacity-40" 
            :width="frames[0].width" 
            :height="frames[0].height"
        ></canvas>
        
        <!-- Crop Overlay -->
        <div v-if="frames && frames[0]" class="absolute inset-0 pointer-events-none">
            <div 
                @mousedown="startDrag"
                class="border-2 border-dashed border-green-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-auto cursor-move relative"
                :style="{
                    position: 'absolute',
                    left: (cropX / videoDim.w * 100) + '%',
                    top: (cropY / videoDim.h * 100) + '%',
                    width: (cropW / videoDim.w * 100) + '%',
                    height: (cropH / videoDim.h * 100) + '%'
                }"
            >
                <div class="absolute -top-7 left-0 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-t font-bold whitespace-nowrap">
                   選取範圍: {{ Math.round(cropW) }} x {{ Math.round(cropH) }} ({{ Math.round(cropX) }}, {{ Math.round(cropY) }})
                </div>

                <!-- Resize Handle -->
                <div 
                    @mousedown="startResize"
                    class="absolute -right-2 -bottom-2 w-5 h-5 bg-white border-2 border-green-500 rounded-full cursor-nwse-resize shadow-lg flex items-center justify-center pointer-events-auto"
                >
                    <div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Controls -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div>
            <label class="text-xs font-bold opacity-60 uppercase block mb-1">起始 X</label>
            <input type="number" v-model.number="cropX" class="w-full bg-white dark:bg-slate-800 border-none rounded-lg p-2 text-sm font-bold shadow-sm">
        </div>
        <div>
            <label class="text-xs font-bold opacity-60 uppercase block mb-1">起始 Y</label>
            <input type="number" v-model.number="cropY" class="w-full bg-white dark:bg-slate-800 border-none rounded-lg p-2 text-sm font-bold shadow-sm">
        </div>
        <div>
            <label class="text-xs font-bold opacity-60 uppercase block mb-1">寬度</label>
            <input type="number" v-model.number="cropW" class="w-full bg-white dark:bg-slate-800 border-none rounded-lg p-2 text-sm font-bold shadow-sm">
        </div>
        <div>
            <label class="text-xs font-bold opacity-60 uppercase block mb-1">高度</label>
            <input type="number" v-model.number="cropH" class="w-full bg-white dark:bg-slate-800 border-none rounded-lg p-2 text-sm font-bold shadow-sm">
        </div>
    </div>

    <button 
        @click="confirmCrop"
        class="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
    >
        確定選取範圍並開始編輯
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
    </button>
  </div>
</template>
