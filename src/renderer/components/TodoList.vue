<template>
    <div>
        <el-container>
            <el-header style="text-align: center;">
                <el-tag type="danger" hit>
                    <i class="el-icon-edit"></i>
                    TodoList
                </el-tag>
            </el-header>
            <el-main style="width: 100%">
                <el-tree :data="data5" ref="tree" show-checkbox node-key="id" default-expand-all :expand-on-click-node="false" @check-change="handleCheckChange" style="width: 100%">
                    <span slot-scope="{ node, data }">
                        <el-input :value="node.label" @change="val=>doneEdit(val, node, data)" @keyup.esc.native="cancelEdit(node)" size="mini">
                            <el-container slot="append">
                                <el-tooltip :content="showProgress(data.progress)" placement="top">
                                    <el-rate size="mini" v-model="data.progress" :max="MAXPROGRESS" @change="val=>{updateProgress(val,node)}" :disabled="!node.isLeaf" disabled-void-color="#C6D1DE" disabled-void-icon-class="el-icon-star-off"></el-rate>
                                </el-tooltip>
                            </el-container>
                        </el-input>
                        <span>
                            <el-button type="primary" icon="el-icon-circle-plus" @click="() => addTodo(node)" size="mini"></el-button>
                            <el-button type="danger" icon="el-icon-delete" @click="() => removeTodo(node, data)" size="mini"></el-button>
                        </span>
                    </span>
                </el-tree>
            </el-main>
            <el-footer>
                <el-input placeholder="Add new Todo" v-model="newTodo" @change="addRootTodo(newTodo)" clearable>
                </el-input>
            </el-footer>
        </el-container>
    </div>
</template>

<script>
import * as constants from "../../utils/constants";
import * as markdownParser from "../../utils/markdownParser";
import * as util from "../../utils/util";

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
            return todo.progress !== constants.MAXPROGRESS
        })
    },
    completed: function (todos) {
        return todos.filter(function (todo) {
            return todo.progress === constants.MAXPROGRESS
        })
    }
}

let id = 1000

let calNodeProgress = function (node) {
    let progressSum = 0
    for (let child of node.childNodes) {
        progressSum += child.data.progress
    }
    let childCount = node.childNodes.length
    return (childCount === 0) ? progressSum : progressSum / childCount
}

let updateCheckStatus = function (node) {
    if (!node) {
        return
    }
    if (node.data.progress === constants.MAXPROGRESS) {
        node.checked = true
        node.indeterminate = false
    } else if (node.data.progress !== 0) {
        node.indeterminate = true
    }
    for (let child of node.childNodes) {
        updateCheckStatus(child)
    }
}

export default {
    name: "todo-list",
    data() {
        return {
            data5: [],
            newTodo: '',
            editedTodo: null,
            visibility: 'all',
            MAXPROGRESS: constants.MAXPROGRESS
        };
    },

    watch: {
        data5: {
            handler: function (todos) {
                todoStorage.save(todos)
            },
            deep: true
        }
    },

    mounted() {
        this.$nextTick(function () {
            markdownParser.LoadMarkdownFile('test.md', res => {
                this.data5 = res[new Date().toLocaleDateString()] || []
                markdownParser.SaveMarkdownFile('res.md', res)
                console.log(res)
                updateCheckStatus(this.$refs.tree.getNode(this.data5[0]))
            })
        });
    },

    beforeDestroy() {
        markdownParser.SaveMarkdownFile('res.md', this.data5)
    },

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

    methods: {
        handleCheckChange(data, checked, subchecked) {
            console.log(data)
            console.log(checked)
            console.log(subchecked)
            let node = this.$refs.tree.getNode(data)
            let originProgress = data.progress
            if (checked) {
                data.progress = constants.MAXPROGRESS
            } else if (!node.indeterminate) {
                data.progress = 0
            }
            if (originProgress !== data.progress) {
                this.updateProgress(data.progress, node)
            }
        },
        updateProgress(newProgress, node) {
            console.log(`updateProgress:`)
            console.log(node)
            node.data.progress = newProgress
            if (newProgress === constants.MAXPROGRESS) {
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

            this.updateProgress(calNodeProgress(parent), parent)
        },
        showProgress(val) {
            return util.ConvertProgressToDisplay(val)
        },
        addRootTodo(newTodo) {
            const newChild = { id: id++, label: newTodo, progress: 0, children: [] };

            this.data5.push(newChild)
        },
        addTodo(node) {
            const newChild = { id: id++, label: 'test', progress: 0, children: [] };
            this.$refs.tree.append(newChild, node)
            this.updateProgress(calNodeProgress(node), node)
        },

        removeTodo(node, data) {
            let parent = node.parent;
            this.$refs.tree.remove(node)
            this.updateProgress(calNodeProgress(parent), parent)
        },

        editTodo: function (todo) {
            this.beforeEditCache = todo.title
            this.editedTodo = todo
        },

        doneEdit: function (newval, node, data) {
            console.log(newval)
            newval = newval.trim()
            if (!newval) {
                this.removeTodo(node)
            }
            data.label = newval
        },

        cancelEdit: function (node) {
            console.log(node)
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
