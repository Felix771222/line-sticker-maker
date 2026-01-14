<template>
  <div>
    <input type="range" v-model="sliderValue" :max="441" />
  </div>
</template>

<script>
export default {
  data() {
    return {
      sliderValue: 0,
    };
  },
};
</script>
