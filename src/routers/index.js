// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import test from '../page/test.vue'
import pt from '../page/pt.vue'
import home from '../page/home.vue'
import index from '../page/index.vue'
import Aside from '../components/Aside.vue'
import Header from '../components/Header.vue'
import sample from '../page/sample.vue'
import threeTest from '../page/threeTest.vue'
import ml from '../page/ml.vue'
import mlTest from '../page/mlTest.vue'
import ts from '../page/ts.vue'
import login from '../page/login.vue'
import compartion from '../page/compartion.vue'
const routes = [
    { 
      path: '/sample', component: sample 
    },
    { 
      path: '/threeTest', component: threeTest 
    },
    { 
      path: '/ts', component: ts 
    },
    { 
      path: '/test', component: test 
    },
    { 
      path: '', component: login 
    },
    { 
      path: '/pt', component: pt 
    },
    { 
      path: '/home', component: home 
    },
    { 
      path: '/index', component: index ,
      children: [
        {
          path: '', // 空路径默认子路由
          name: 'test',
          component: test
        },
        {
          path: 'sample', 
          name: 'sample',
          component: sample
        },
         {
          path: 'compartion', 
          name: 'compartion',
          component: compartion
        },
        {
          path: 'ml', 
          name: 'ml',
          component: ml
        },
        {
          path: 'mlTest', 
          name: 'mlTest',
          component: mlTest
        },
        {
          path: 'pt', 
          name: 'pt',
          component: pt
        }
      ]
    },
    {
       path: '/Aside', component: Aside
      },
    { 
      path: '/Header', component: Header 
    },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
