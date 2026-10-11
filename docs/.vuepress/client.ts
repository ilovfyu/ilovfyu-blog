import { defineClientConfig } from 'vuepress/client'
import TechHome from './theme/components/TechHome.vue'
import PostIndex from './theme/components/PostIndex.vue'
import AboutPage from './theme/components/AboutPage.vue'
import KnowledgeBase from './theme/components/KnowledgeBase.vue'
import ProjectIndex from './theme/components/ProjectIndex.vue'
import CosmicCanvas from './theme/components/CosmicCanvas.vue'
import InteractionMotion from './theme/components/InteractionMotion.vue'
import PageGate from './theme/components/PageGate.vue'
import ArticleAtmosphere from './theme/components/ArticleAtmosphere.vue'

import './theme/styles/theme.css'

export default defineClientConfig({
  enhance({ app }) {
    app.component('tech-home', TechHome)
    app.component('post-index', PostIndex)
    app.component('about-page', AboutPage)
    app.component('knowledge-base', KnowledgeBase)
    app.component('project-index', ProjectIndex)
  },
  rootComponents: [CosmicCanvas, InteractionMotion, PageGate, ArticleAtmosphere],
})
