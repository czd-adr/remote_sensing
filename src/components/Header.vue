<template>
    <div style="display:flex;line-height: 60px;">  
        <dIV style="cursor:pointer">
            <i :class="icon" style="font-size:20px" @click="collapse"></i>
        </dIV> 
        <div style="flex:1;text-align: center;font-size: 20px">
            <span>欢迎来到宠物商店管理系统</span>
        </div>

        <el-dropdown> 
            <span>{{manner.username}}</span><i class="el-icon-arrow-down" style="margin-left:5px;"></i>
            <el-dropdown-menu slot="dropdown">
            <el-dropdown-item @click.native="toUser">个人中心</el-dropdown-item>
            <el-dropdown-item @click.native="Logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
        </el-dropdown>
</div>
</template>

<script >
export default {
    name:"Header",
    props:{
        icon:String
    },
    data() {
        return {
                manner:JSON.parse(sessionStorage.getItem("CurUser"))
        }
    },
    // 生命周期 - 创建完成（访问当前this实例）
    created() {
        // this.$router.push("/Home")

    },
    // 生命周期 - 挂载完成（访问DOM元素）
    mounted() {

    },
    // methods方法
    methods: {

        toUser(){
            console.log('touser')
            this.$router.push("/Home")
        },
        Logout(){
            console.log('logout')
          this.$confirm('您确定要退出登录吗?', '提示', {
                    confirmButtonText: '确定',  //确认按钮的文字显示
                    type: 'warning',
                    center: true, //文字居中显示

                })
                    .then(() => {
                        this.$message({
                            type:'success',
                            message:'退出登录成功'
                        })

                        this.$router.push("/")
                        sessionStorage.clear()
                    })
                    .catch(() => {
                        this.$message({
                            type:'info',
                            message:'已取消退出登录'
                        })
                    })
        },
        collapse(){
            this.$emit('doCollapse')
        },
    }
}
</script>
<style scoped>


</style>
