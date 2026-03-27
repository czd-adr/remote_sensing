
<template>

  <el-container style="height: 100vh; border: 1px solid #eee">
    <el-aside
      :width="aside_width"
      style="background-color: rgb(238, 241, 246); height: 100%;"
    >
      <Aside/>
    </el-aside>


     <el-container style="height: 100%;">

    
    <el-main style="height: 100%;">
            <router-view/>
    </el-main>
  </el-container>

  </el-container>
</template>


<script>

import Aside from '../components/Aside.vue';
// import Header from '../components/Header.vue';

export default {
    name:"Index",
    components:{
        Aside,
        // Header
    },
    data(){
        return {
          isCollapse:false,
          aside_width:'200px',  
          icon:'el-icon-s-fold'
        }
    },
    // 生命周期 - 创建完成（访问当前this实例）
    created() {

    },
    // 生命周期 - 挂载完成（访问DOM元素）
    mounted() {

    },
    // methods方法
    methods: {
        doCollapse(){
            //console.log(111111) 
            this.isCollapse = !this.isCollapse

            if(!this.isCollapse){   //展开
              this.aside_width='200px'
              this.icon='el-icon-s-fold'
            }
            else{                   //关闭
              this.aside_width='64px'
              this.icon='el-icon-s-unfold'
            }
        }
    }
}
</script>

<style>
  .el-header {
    /*background-color: #B3C0D1;*/
    color: #333;
    line-height: 60px;
  }

  .el-main{
    padding: 5px;
  }
  
  .el-aside {
    color: #333;
  }
</style>
