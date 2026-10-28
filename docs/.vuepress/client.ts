import { defineClientConfig } from 'vuepress/client'
import TechHome from './theme/components/TechHome.vue'
import PostIndex from './theme/components/PostIndex.vue'
import AboutPage from './theme/components/AboutPage.vue'
import KnowledgeBase from './theme/components/KnowledgeBase.vue'
import TopicIndex from './theme/components/TopicIndex.vue'
import ProjectIndex from './theme/components/ProjectIndex.vue'
import ProjectShowcase from './theme/components/ProjectShowcase.vue'
import ProjectRecordHero from './theme/components/ProjectRecordHero.vue'
import CosmicCanvas from './theme/components/CosmicCanvas.vue'
import InteractionMotion from './theme/components/InteractionMotion.vue'
import PageGate from './theme/components/PageGate.vue'
import ArticleAtmosphere from './theme/components/ArticleAtmosphere.vue'
import ArticleBookTransition from './theme/components/ArticleBookTransition.vue'
import BlogLayout from './theme/components/BlogLayout.vue'
import AIChatDrawer from './theme/components/AIChatDrawer.vue'

import './theme/styles/theme.css'
import './theme/styles/moyin-landing.css'
import './theme/styles/yuliao-landing.css'
import './theme/styles/yiji-landing.css'
import './theme/styles/xiake-showcase.css'
import './theme/styles/platform-landings.css'
import './theme/styles/annotation-landing.css'
import './theme/styles/project-showcase.css'
import './theme/styles/building-projects.css'
import './theme/styles/knowledge.css'
import './theme/styles/topics.css'
import './theme/styles/catalog-scenes.css'
import './theme/styles/article-book.css'
import './theme/styles/motion-polish.css'
import './theme/styles/editorial.css'
import './theme/styles/article-controls.css'
import './theme/styles/spectral-motion.css'
import './theme/styles/assistant.css'

export default defineClientConfig({
  layouts: { Layout: BlogLayout },
  enhance({ app }) {
    app.component('tech-home', TechHome)
    app.component('post-index', PostIndex)
    app.component('about-page', AboutPage)
    app.component('knowledge-base', KnowledgeBase)
    app.component('topic-index', TopicIndex)
    app.component('project-index', ProjectIndex)
    app.component('project-showcase', ProjectShowcase)
    app.component('project-record-hero', ProjectRecordHero)
  },
  rootComponents: [CosmicCanvas, InteractionMotion, ArticleBookTransition, PageGate, ArticleAtmosphere, AIChatDrawer],
})
