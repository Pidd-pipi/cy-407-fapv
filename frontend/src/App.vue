<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <div class="app-shell">
        <header class="topbar">
          <RouterLink class="brand" to="/">
            <span>工艺品3D展示画廊</span>
            <strong>Craft Gallery</strong>
          </RouterLink>
          <nav>
            <RouterLink :to="galleryPath">3D展厅</RouterLink>
            <RouterLink to="/manage/artifacts">展品库</RouterLink>
            <RouterLink to="/manage/exhibitions">展览管理</RouterLink>
            <RouterLink :to="tourPath">导览编辑</RouterLink>
          </nav>
        </header>
        <main>
          <RouterView v-if="ready" />
          <div v-else class="boot-state">
            <n-spin size="large" />
            <span>正在读取本地展厅数据</span>
          </div>
        </main>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import type { GlobalThemeOverrides } from 'naive-ui';
import { useAnnotationStore } from '@/stores/annotation';
import { useArtifactStore } from '@/stores/artifact';
import { useExhibitionStore } from '@/stores/exhibition';
import { useTourStore } from '@/stores/tour';

const artifactStore = useArtifactStore();
const exhibitionStore = useExhibitionStore();
const annotationStore = useAnnotationStore();
const tourStore = useTourStore();
const ready = ref(false);

const galleryPath = computed(() => `/exhibitions/${exhibitionStore.exhibitions[0]?.id ?? 'exhibition-heritage-hall'}`);
const tourPath = computed(() => `/manage/tours/${tourStore.tours[0]?.id ?? 'tour-default-route'}`);

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#173f35',
    primaryColorHover: '#24594d',
    primaryColorPressed: '#0e2f27',
    infoColor: '#3f5f96',
    successColor: '#4f776d',
    warningColor: '#9d7b36',
    errorColor: '#bb4d3e',
    borderRadius: '6px',
    fontFamily: 'var(--font-body)'
  },
  Button: {
    borderRadiusMedium: '6px',
    textColorPrimary: '#fbf5e8'
  },
  Card: {
    borderRadius: '8px'
  }
};

onMounted(async () => {
  await artifactStore.load();
  await exhibitionStore.load();
  await annotationStore.load();
  await tourStore.load();
  ready.value = true;
});
</script>
