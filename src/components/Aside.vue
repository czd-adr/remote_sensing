<template>
  <el-menu
    background-color="#606266"
    text-color="#fff"
    active-text-color="#ffd04b"
    style="height: 100vh"
    default-active="/index"
    :collapse="isCollapse"
    :collapse-transition="false"
    router
  >
    <el-menu-item index="/index">
      <i class="el-icon-user-solid"></i>
      <span slot="title">首页</span>
    </el-menu-item>

    <el-menu-item index="/index/ml">
      <i class="el-icon-user-solid"></i>
      <span slot="title">机器学习结果</span>
    </el-menu-item>
    <el-menu-item index="/index/compartion">
      <i class="el-icon-user-solid"></i>
      <span slot="title">差异对比</span>
    </el-menu-item>
    <el-menu-item index="/index/sample">
      <i class="el-icon-s-goods"></i>
      <span slot="title">样本信息</span>
    </el-menu-item>

    <el-menu-item index="pt">
      <i class="el-icon-s-goods"></i>
      <span slot="title">植被监测信息</span>
    </el-menu-item>

    <el-menu-item index="/index/mlTest">
      <i class="el-icon-s-goods"></i>
      <span slot="title">变化监测信息</span>
    </el-menu-item>
  </el-menu>
</template>

<script setup>
import { ref } from 'vue'
const isCollapse = ref(false)
// import {
//   House    // 对应以前的 el-icon-s-home

// } from '@element-plus/icons-vue'
// export default {
//   name: 'Aside',
//   props: {
//     isCollapse: Boolean,
//   },
//   components: {
//     House,

//   },
// }
</script>
<style scoped>
.title:hover {
  text-shadow: 2px 3px 1px rgb(12, 2, 4);
}
.house {
  margin-left: 10px;
  color: #ffd04b;
  font-size: 20px;
}

.el-menu-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.el-menu-item:last-child {
  border-bottom: none;
}
</style>
