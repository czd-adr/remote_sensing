<template>
    <div class="page-container">
        <h1>Welcome to the Page</h1>
    </div>
</template>
<script lang="ts">
import { defineComponent, onMounted, h } from 'vue';

export default defineComponent({
    name: 'TsPage',
    data() {
        return {
            message: 'This is a basic Vue 3 component with TypeScript.'
        };
    },
    setup() {
        onMounted(() => {
            console.log('Component mounted');
        });

        // 返回渲染函数 - 这会完全替代 template
        return () => h('div', { class: 'page-container' }, [
            h('h1', 'Welcome to the Page'),
            h('p', 'This is rendered by render function')
        ]);
    }
});
</script>

<style scoped>
.page-container {
    padding: 20px;
    font-family: Arial, sans-serif;
}
</style>
