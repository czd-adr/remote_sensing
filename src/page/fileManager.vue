<template>
  <div class="fm-container">
    <!-- 上传卡片 -->
    <el-card class="upload-card" shadow="hover">
      <template #header>
        <div class="list-header">
          <span class="card-title">上传文件</span>
          <el-button type="primary" @click="openUploadDialog"
            >上传文件</el-button
          >
        </div>
      </template>
      <div class="upload-tip">
        点击右上角「上传文件」按钮，填写影像信息后上传文件
      </div>
    </el-card>

    <!-- 文件列表卡片 -->
    <el-card class="list-card" shadow="hover">
      <template #header>
        <div class="list-header">
          <span class="card-title">文件列表</span>
          <el-button size="small" @click="loadList">刷新</el-button>
        </div>
      </template>
      <el-table
        :data="fileList"
        border
        stripe
        v-loading="loading"
        style="width: 100%"
      >
        <el-table-column
          prop="fileName"
          label="文件名"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="originalFilename"
          label="原始文件名"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="fileType"
          label="类型"
          width="100"
          align="center"
        />
        <el-table-column label="大小" width="120" align="center">
          <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column
          prop="uploadTime"
          label="上传时间"
          width="180"
          align="center"
        />
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button
              type="danger"
              size="small"
              link
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 上传弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="上传文件"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form :model="uploadForm" label-width="100px">
        <el-form-item label="时间年份" required>
          <el-input v-model="uploadForm.year" placeholder="例如 2026" />
        </el-form-item>
        <el-form-item label="时间月份" required>
          <el-select
            v-model="uploadForm.month"
            placeholder="请选择月份"
            style="width: 100%"
          >
            <el-option v-for="m in 12" :key="m" :label="m + ' 月'" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="特征波段" required>
          <el-input v-model="uploadForm.band" placeholder="例如 NDVI" />
        </el-form-item>
        <el-form-item label="上传文件" required>
          <el-upload
            ref="uploadRef"
            drag
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-but
        <el-button
          type="primary"
          :loading="uploading"
          @click="handleConfirmUpload"
        >
          确认上传
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { uploadFile, getFileList, deleteFile } from '@/api/fileManager'

const fileList = ref([])
const loading = ref(false)

// 加载文件列表
const loadList = async () => {
  loading.value = true
  try {
    const res = await getFileList()
    fileList.value = res.data || []
  } catch (e) {
    console.error('加载文件列表失败:', e)
    ElMessage.error('加载文件列表失败')
  } finally {
    loading.value = false
  }
}

// ============ 上传弹窗相关状态 ============
const dialogVisible = ref(false)
const uploading = ref(false)
const uploadRef = ref(null)
const selectedFile = ref(null)
const uploadForm = ref({
  year: '',
  month: '',
  band: ''
})

const openUploadDialog = () => {
  dialogVisible.value = true
}

const handleFileChange = (file) => {
  selectedFile.value = file.raw
}

const handleFileRemove = () => {
  selectedFile.value = null
}

const resetUploadForm = () => {
  uploadForm.value = { year: '', month: '', band: '' }
  selectedFile.value = null
  uploadRef.value && uploadRef.value.clearFiles()
}

// 确认上传：校验表单后调用后端 upload 接口
// 注：年份/月份/特征波段暂由前端收集，后端 upload 接口当前仅接收 file
const handleConfirmUpload = async () => {
  if (!uploadForm.value.year) return ElMessage.warning('请输入时间年份')
  if (!uploadForm.value.month) return ElMessage.warning('请选择时间月份')
  if (!uploadForm.value.band) return ElMessage.warning('请输入特征波段')
  if (!selectedFile.value) return ElMessage.warning('请选择要上传的文件')

  uploading.value = true
  try {
    const res = await uploadFile(selectedFile.value)
    if (res.data && res.data.status === 'success') {
      ElMessage.success('上传成功')
      dialogVisible.value = false
      resetUploadForm()
      loadList()
    } else {
      ElMessage.error((res.data && res.data.message) || '上传失败')
    }
  } catch (e) {
    console.error('上传失败:', e)
    ElMessage.error('上传失败')
  } finally {
    uploading.value = false
  }
}

// 删除文件
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除文件「${row.fileName}」吗？`, '提示', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    })
  } catch {
    return
  }

  try {
    const res = await deleteFile(row.fileName)
    if (res.data && res.data.status === 'success') {
      ElMessage.success('删除成功')
      loadList()
    } else {
      ElMessage.error((res.data && res.data.message) || '删除失败')
    }
  } catch (e) {
    console.error('删除失败:', e)
    ElMessage.error('删除失败')
  }
}

// 文件大小格式化
const formatSize = (size) => {
  if (size == null || size === '') return '-'
  const num = Number(size)
  if (isNaN(num)) return String(size)

  return num.toFixed(2) + ' MB'
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.fm-container {
  padding: 16px;
  background-color: #f4f6f9;
  min-height: 100vh;
  box-sizing: border-box;
}

.upload-card {
  margin-bottom: 16px;
}

.card-title {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-tip {
  color: #909399;
  font-size: 14px;
}
</style>
