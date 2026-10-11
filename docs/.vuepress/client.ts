import { defineClientConfig } from 'vuepress/client'
import TechHome from './theme/components/TechHome.vue'
import PostIndex from './theme/components/PostIndex.vue'
import AboutPage from './theme/components/AboutPage.vue'
import KnowledgeBase from './theme/components/KnowledgeBase.vue'
import ProjectIndex from './theme/components/ProjectIndex.vue'
import ProjectShowcase from './theme/components/ProjectShowcase.vue'
import ProjectRecordHero from './theme/components/ProjectRecordHero.vue'
import CosmicCanvas from './theme/components/CosmicCanvas.vue'
import InteractionMotion from './theme/components/InteractionMotion.vue'
import PageGate from './theme/components/PageGate.vue'
import ArticleAtmosphere from './theme/components/ArticleAtmosphere.vue'

import './theme/styles/theme.css'
import './theme/styles/moyin-landing.css'
import './theme/styles/yuliao-landing.css'
import './theme/styles/yiji-landing.css'
import './theme/styles/xiake-showcase.css'
import './theme/styles/platform-landings.css'
import './theme/styles/annotation-landing.css'
import './theme/styles/project-showcase.css'

export default defineClientConfig({
  enhance({ app }) {
    app.component('tech-home', TechHome)
    app.component('post-index', PostIndex)
    app.component('about-page', AboutPage)
    app.component('knowledge-base', KnowledgeBase)
    app.component('project-index', ProjectIndex)
    app.component('project-showcase', ProjectShowcase)
    app.component('project-record-hero', ProjectRecordHero)
  },
  rootComponents: [CosmicCanvas, InteractionMotion, PageGate, ArticleAtmosphere],
})
