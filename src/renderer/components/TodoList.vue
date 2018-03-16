<template>
    <div>
        <el-row type="flex" justify="space-between" v-for="todo in filteredTodos" class="el-margin-bottom" :key="todo.id">
            <el-col>
                <el-input v-model="todo.title" @blur="doneEdit(todo)" @change="doneEdit(todo)" @keyup.esc="cancelEdit(todo)" size="small">
                    <el-checkbox slot="prepend" :indeterminate="todo.progress!==0&&todo.progress!==MAXPROGRESS" v-model="todo.completed" @change="val=>{todo.progress = (val ? MAXPROGRESS : 0)}"></el-checkbox>
                    <el-container slot="append">
                        <el-tooltip :content="showProgress(todo.progress)" placement="top">
                            <el-rate v-model="todo.progress" :max="MAXPROGRESS" @change="val=>{todo.completed = (val===MAXPROGRESS? true : false)}"></el-rate>
                        </el-tooltip>
                    </el-container>
                </el-input>
            </el-col>
            <el-button type="danger" icon="el-icon-delete" @click="removeTodo(todo)" size="small"></el-button>
        </el-row>

        <el-tree :data="data5" ref="tree" show-checkbox node-key="id" default-expand-all :expand-on-click-node="false" @check-change="handleCheckChange">
            <span slot-scope="{ node, data }">
                <span>{{ node.label }}</span>
                <el-input v-model="node.label" @blur="doneEdit(node)" @change="doneEdit(node)" @keyup.esc="cancelEdit(node)" size="mini">
                    <el-container slot="append">
                        <el-tooltip :content="showProgress(data.progress)" placement="top">
                            <el-rate size="mini" v-model="data.progress" :max="MAXPROGRESS" @change="val=>{handleProgress(val,data,node)}" :disabled="!node.isLeaf" disabled-void-color="#C6D1DE" disabled-void-icon-class="el-icon-star-off"></el-rate>
                        </el-tooltip>
                    </el-container>
                </el-input>
                <span>
                    <el-button type="primary" icon="el-icon-circle-plus" @click="() => addTodo(data)" size="mini"></el-button>
                    <el-button type="danger" icon="el-icon-delete" @click="() => removeTodo(node, data)" size="mini"></el-button>
                </span>
            </span>
        </el-tree>
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

// let updateChildrenCheckStatus = function (node, newProgress) {
//     node.data.progress = newProgress
//     // newProgress cannot be 0
//     if (newProgress === MAXPROGRESS) {
//         node.checked = true
//     } else {
//         node.indeterminate = true
//     }
//     for (let child of node.childNodes) {
//         updateChildrenCheckStatus(child, newProgress)
//     }
// }

let updateParentCheckStatus = function (node, newProgress) {
    node.data.progress = newProgress
    if (newProgress === MAXPROGRESS) {
        node.checked = true
        node.indeterminate = false
    } else if (newProgress === 0) {
        node.checked = false
        node.indeterminate = false
    } else {
        node.indeterminate = true
    }
    let parent = node.parent
    if (!parent) {
        return
    }
    let parentNewProgress = 0
    for (let sibling of parent.childNodes) {
        parentNewProgress += sibling.data.progress || 0
    }
    parentNewProgress = parentNewProgress / parent.childNodes.length
    updateParentCheckStatus(parent, parentNewProgress)
}

export default {
    name: "todo-list",
    data() {
        return {
            value4: null,
            data5: [{
                id: 1,
                label: '一级 1',
                children: [{
                    id: 4,
                    label: '二级 1-1',
                    children: [{
                        id: 9,
                        label: '三级 1-1-1'
                    }, {
                        id: 10,
                        label: '三级 1-1-2'
                    }]
                }]
            }, {
                id: 2,
                label: '一级 2',
                children: [{
                    id: 5,
                    label: '二级 2-1'
                }, {
                    id: 6,
                    label: '二级 2-2'
                }]
            }, {
                id: 3,
                label: '一级 3',
                children: [{
                    id: 7,
                    label: '二级 3-1'
                }, {
                    id: 8,
                    label: '二级 3-2'
                }]
            }],
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
        handleCheckChange(data, checked, subchecked) {
            console.log(data)
            console.log(checked)
            console.log(subchecked)
            let node = this.$refs.tree.getNode(data)
            let originProgress = data.progress
            if (checked) {
                data.progress = MAXPROGRESS
            } else if (!node.indeterminate) {
                data.progress = 0
            }
            if (originProgress !== data.progress) {
                this.handleProgress(data.progress, data, node)
            }
        },
        handleProgress(val, data, node) {
            console.log(val)
            console.log(data)
            console.log(node)
            // update children
            // updateChildrenCheckStatus(node, val)
            // // val cannot be 0
            // if (val === MAXPROGRESS) {
            //     this.$refs.tree.setChecked(data, true, true)
            // }
            // todo: update parent
            updateParentCheckStatus(node, val)
        },
        showProgress(val) {
            return `${val * 25}%`
        },
        addTodo: function () {
            var value = this.newTodo && this.newTodo.trim()
            console.log(`newTodo ${value}`)
            if (!value) {
                return
            }
            this.todos.push({
                id: todoStorage.uid++,
                title: value,
                completed: false,
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

<style>
.el-margin-bottom {
  margin-bottom: 10px;
}
</style>
