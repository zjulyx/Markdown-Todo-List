<template>
    <div>
        <el-row type="flex" justify="space-between" v-for="todo in filteredTodos" class="todo" :key="todo.id">
            <el-col :span="18">
                <el-input v-model="todo.title" @blur="doneEdit(todo)" @change="doneEdit(todo)" @keyup.esc="cancelEdit(todo)">
                    <el-checkbox slot="prepend" :indeterminate="todo.progress!==0&&todo.progress!==MAXPROGRESS" :checked="todo.progress===MAXPROGRESS" @change="val=>{todo.progress = (val ? MAXPROGRESS : 0);}"></el-checkbox>
                    <el-button slot="append" type="danger" icon="el-icon-delete" @click="removeTodo(todo)"></el-button>
                    <!-- <el-rate slot="append" v-model="todo.progress" :max="4" show-score score-template="{value}*25%"></el-rate> -->
                    <!-- <el-slider slot="append" v-model="todo.progress" :step="25" show-stops>
                </el-slider> -->
                </el-input>
            </el-col>
            <el-col :offset="1" :span="3">
                <el-rate v-model="todo.progress" :max="MAXPROGRESS"></el-rate>
                <!-- <el-slider v-model="todo.progress" :step="25" show-stops>
                </el-slider> -->
            </el-col>
        </el-row>
        <el-input placeholder="Add new Todo" v-model="newTodo" @change="addTodo(newTodo)" clearable>
        </el-input>
    </div>
</template>

<script>

// Full spec-compliant TodoMVC with localStorage persistence
// and hash-based routing in ~120 effective lines of JavaScript.

// localStorage persistence
const MAXPROGRESS = 4
var STORAGE_KEY = 'todos-vuejs-2.0'
var todoStorage = {
    fetch: function () {
        var todos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
        todos.forEach(function (todo, index) {
            todo.id = index
        })
        todoStorage.uid = todos.length
        return todos
    },
    save: function (todos) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
    }
}

// visibility filters
var filters = {
    all: function (todos) {
        return todos
    },
    active: function (todos) {
        return todos.filter(function (todo) {
            return todo.progress !== MAXPROGRESS
        })
    },
    completed: function (todos) {
        return todos.filter(function (todo) {
            return todo.progress === MAXPROGRESS
        })
    }
}

export default {
    name: "todo-list",
    data() {
        return {
            value4: null,
            todos: todoStorage.fetch(),
            newTodo: '',
            editedTodo: null,
            visibility: 'all',
            MAXPROGRESS: MAXPROGRESS
        };
    },

    // watch todos change for localStorage persistence
    watch: {
        todos: {
            handler: function (todos) {
                todoStorage.save(todos)
            },
            deep: true
        }
    },

    // computed properties
    // http://vuejs.org/guide/computed.html
    computed: {
        filteredTodos: function () {
            return filters[this.visibility](this.todos)
        },
        remaining: function () {
            return filters.active(this.todos).length
        },
        allDone: {
            get: function () {
                return this.remaining === 0
            },
            set: function (value) {
                this.todos.forEach(function (todo) {
                    todo.completed = value
                })
            }
        }
    },

    filters: {
        pluralize: function (n) {
            return n === 1 ? 'item' : 'items'
        }
    },

    // methods that implement data logic.
    // note there's no DOM manipulation here at all.
    methods: {
        addTodo: function () {
            var value = this.newTodo && this.newTodo.trim()
            console.log(`newTodo ${value}`)
            if (!value) {
                return
            }
            this.todos.push({
                id: todoStorage.uid++,
                title: value,
                // completed: false,
                progress: 0
            })
            this.newTodo = ''
        },

        removeTodo: function (todo) {
            this.todos.splice(this.todos.indexOf(todo), 1)
        },

        editTodo: function (todo) {
            this.beforeEditCache = todo.title
            this.editedTodo = todo
        },

        doneEdit: function (todo) {
            if (!this.editedTodo) {
                return
            }
            this.editedTodo = null
            todo.title = todo.title.trim()
            if (!todo.title) {
                this.removeTodo(todo)
            }
        },

        cancelEdit: function (todo) {
            this.editedTodo = null
            todo.title = this.beforeEditCache
        },

        removeCompleted: function () {
            this.todos = filters.active(this.todos)
        }
    },

    // a custom directive to wait for the DOM to be updated
    // before focusing on the input field.
    // http://vuejs.org/guide/custom-directive.html
    directives: {
        'todo-focus': function (el, binding) {
            if (binding.value) {
                el.focus()
            }
        }
    }
};
</script>
