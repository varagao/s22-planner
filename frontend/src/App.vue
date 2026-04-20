<script setup>
</script>

<template>
  <RouterView />
</template>

<style>
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-base);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
</style>
