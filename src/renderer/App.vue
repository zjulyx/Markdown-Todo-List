<template>
    <div id="app" v-cloak>
        <TodoList></TodoList>
    </div>
</template>

<script>
import TodoList from "@/components/TodoList";

export default {
    name: "markdowntodolist",
    components: {
        TodoList
    }
};
</script>

<style>
/* CSS */
[v-cloak] {
  display: none;
}
</style>
