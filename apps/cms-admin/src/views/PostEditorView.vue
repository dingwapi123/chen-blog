<script setup lang="ts">
import { ArrowLeft, Send } from 'lucide-vue-next'
import { computed, onMounted, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminShell from '@/components/AdminShell.vue'
import PostEditorForm from '@/components/PostEditorForm.vue'
import { getPost, listMedia, listTaxonomy, publishPost, savePost, type AdminMedia, type AdminPost, type TaxonomyItem } from '@/features/content/api'
const route=useRoute(),router=useRouter();const postId=computed(()=>typeof route.params.postId==='string'?route.params.postId:undefined)
const post=shallowRef<AdminPost|null>(null),categories=shallowRef<TaxonomyItem[]>([]),tags=shallowRef<TaxonomyItem[]>([]),media=shallowRef<AdminMedia[]>([]),loading=shallowRef(true),saving=shallowRef(false),message=shallowRef('')
onMounted(async()=>{try{const currentPostId=postId.value;const [postValue,categoryValues,tagValues,mediaValues]=await Promise.all([currentPostId?getPost(currentPostId):Promise.resolve(null),listTaxonomy('categories'),listTaxonomy('tags'),listMedia()]);post.value=postValue;categories.value=categoryValues;tags.value=tagValues;media.value=mediaValues}catch(error){message.value=error instanceof Error?error.message:'载入失败。'}finally{loading.value=false}})
async function save(input:Parameters<typeof savePost>[1]){saving.value=true;message.value='';try{const id=await savePost(postId.value,input);message.value='已保存。';if(!postId.value)await router.replace({name:'post-editor',params:{postId:id}});post.value=await getPost(id)}catch(error){message.value=error instanceof Error?error.message:'保存失败。'}finally{saving.value=false}}
async function publish(){if(!postId.value)return;try{await publishPost(postId.value);message.value='文章已发布。';post.value=await getPost(postId.value)}catch(error){message.value=error instanceof Error?error.message:'发布失败。'}}
</script>
<template><AdminShell><div class="page-head"><div><RouterLink class="back" :to="{name:'dashboard'}"><ArrowLeft :size="16"/>文章</RouterLink><p class="eyebrow">{{postId?'editing':'new post'}}</p><h1 class="page-title">{{postId?'编辑文章':'新建文章'}}</h1></div><button v-if="postId && post?.status==='draft'" class="button" type="button" @click="publish"><Send :size="16"/>发布</button></div><p v-if="message" class="hint">{{message}}</p><div v-if="loading" class="empty-state">正在载入编辑器…</div><PostEditorForm v-else :post :categories :tags :media :saving @save="save"/></AdminShell></template>
<style scoped>.page-head{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin-bottom:1.5rem}.back{display:inline-flex;align-items:center;gap:.35rem;margin-bottom:1rem;color:var(--text-muted);font-size:.85rem}.back:hover{color:var(--accent)}.page-head .eyebrow{margin:.2rem 0 0}</style>
