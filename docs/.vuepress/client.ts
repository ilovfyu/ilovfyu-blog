import { defineClientConfig } from 'vuepress/client'
import TechHome from './theme/components/TechHome.vue'
import CosmicCanvas from './theme/components/CosmicCanvas.vue'
import PageGate from './theme/components/PageGate.vue'
import ZodiacCarousel from './theme/components/ZodiacCarousel.vue'
import XiakeChat from './theme/components/XiakeChat.vue'
import AboutPage from './theme/components/AboutPage.vue'
import KnowledgeBase from './theme/components/KnowledgeBase.vue'
import TopicHub from './theme/components/TopicHub.vue'
import MathNoteNav from './theme/components/MathNoteNav.vue'
import MathSpecial from './theme/components/MathSpecial.vue'
import ArticleAtmosphere from './theme/components/ArticleAtmosphere.vue'
import AnnotationLanding from './theme/components/AnnotationLanding.vue'
import PlatformLanding from './theme/components/PlatformLanding.vue'
import YuliaoLanding from './theme/components/YuliaoLanding.vue'
import YijiLanding from './theme/components/YijiLanding.vue'
import MoyinLanding from './theme/components/MoyinLanding.vue'
import ProjectHome from './theme/components/ProjectHome.vue'
import AiChatDock from './theme/components/AiChatDock.vue'
import './theme/styles/platform-landings.css'
import './theme/styles/yuliao-landing.css'
import './theme/styles/yiji-landing.css'
import './theme/styles/moyin-landing.css'
import './theme/styles/custom-base.css'
import './theme/styles/custom-cosmic.css'
import './theme/styles/custom-gate.css'
import './theme/styles/custom-nav.css'
import './theme/styles/custom-home-layout.css'
import './theme/styles/custom-knowledge.css'
import './theme/styles/custom-topics.css'
import './theme/styles/custom-math-special.css'
import './theme/styles/custom-math-note.css'
import './theme/styles/custom-home.css'
import './theme/styles/custom-about.css'
import './theme/styles/custom-xiake.css'
import './theme/styles/custom-article.css'
import './theme/styles/custom-responsive.css'
import './theme/styles/custom-annotate.css'
import './theme/styles/custom-projects.css'

export default defineClientConfig({
  enhance({ app }) {
    app.component('tech-home', TechHome)
    app.component('zodiac-carousel', ZodiacCarousel)
    app.component('xiake-chat', XiakeChat)
    app.component('about-page', AboutPage)
    app.component('knowledge-base', KnowledgeBase)
    app.component('topic-hub', TopicHub)
    app.component('math-special', MathSpecial)
    app.component('annotation-landing', AnnotationLanding)
    app.component('platform-landing', PlatformLanding)
    app.component('yuliao-landing', YuliaoLanding)
    app.component('yiji-landing', YijiLanding)
    app.component('moyin-landing', MoyinLanding)
  },
  rootComponents: [CosmicCanvas, PageGate, ArticleAtmosphere, MathNoteNav, ProjectHome, AiChatDock],
})
