<script lang="ts">
import { defineComponent, h } from 'vue'
import { renderAssistantMarkdown } from '../utils/assistant-markdown'

export default defineComponent({
  props: { content: { type: String, required: true } },
  setup(props) { return () => h('div', { class: 'ai-message-content ai-markdown' }, renderAssistantMarkdown(props.content)) },
})
</script>
