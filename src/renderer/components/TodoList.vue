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
import * as markdownParser from "../../utils/markdownParser";
import * as constants from "../../utils/constants";
import fs from 'fs'

// Full spec-compliant TodoMVC with localStorage persistence
// and hash-based routing in ~120 effective lines of JavaScript.

// localStorage persistence
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

// let updateChildrenCheckStatus = function (node, newProgress) {
//     node.data.progress = newProgress
//     // newProgress cannot be 0
//     if (newProgress === constants.MAXPROGRESS) {
//         node.checked = true
//     } else {
//         node.indeterminate = true
//     }
//     for (let child of node.childNodes) {
//         updateChildrenCheckStatus(child, newProgress)
//     }
// }

let id = 1000

// let updateParentCheckStatus = function (node, newProgress) {
//     node.data.progress = newProgress
//     if (newProgress === constants.MAXPROGRESS) {
//         node.checked = true
//         node.indeterminate = false
//     } else if (newProgress === 0) {
//         node.checked = false
//         node.indeterminate = false
//     } else {
//         node.indeterminate = true
//     }
//     let parent = node.parent
//     if (!parent) {
//         return
//     }
//     let progressSum = 0
//     for (let sibling of parent.childNodes) {
//         progressSum += sibling.data.progress || 0
//     }
//     progressSum = progressSum / parent.childNodes.length
//     updateParentCheckStatus(parent, progressSum)
// }

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
            value4: null,
            // data5: [{
            //     id: 1,
            //     label: '一级 1',
            //     children: [{
            //         id: 4,
            //         label: '二级 1-1',
            //         children: [{
            //             id: 9,
            //             label: '三级 1-1-1'
            //         }, {
            //             id: 10,
            //             label: '三级 1-1-2'
            //         }]
            //     }]
            // }, {
            //     id: 2,
            //     label: '一级 2',
            //     children: [{
            //         id: 5,
            //         label: '二级 2-1'
            //     }, {
            //         id: 6,
            //         label: '二级 2-2'
            //     }]
            // }, {
            //     id: 3,
            //     label: '一级 3',
            //     children: [{
            //         id: 7,
            //         label: '二级 3-1'
            //     }, {
            //         id: 8,
            //         label: '二级 3-2'
            //     }]
            // }],
            data5: [],
            newTodo: '',
            editedTodo: null,
            visibility: 'all',
            MAXPROGRESS: constants.MAXPROGRESS
        };
    },

    // watch todos change for localStorage persistence
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
            // Code that will run only after the
            // entire view has been rendered
            markdownParser.LoadMarkdownFile('test.md', res => {
                this.data5 = res[new Date().toLocaleDateString()] || []
                fs.writeFile('res.md', markdownParser.convertObjToMarkDown(res), err => {
                    console.log(err)
                })
                console.log(res)
                updateCheckStatus(this.$refs.tree.getNode(this.data5[0]))
                // console.log(this.data5)
            })
            // updateCheckStatus(this.$refs.tree.getNode(this.data5[0]))
        });
    },

    beforeDestroy() {
        fs.write('res.md', markdownParser.convertObjToMarkDown(this.data5), err => {
            console.log(err)
        })
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
            return markdownParser.convertProgressToDisplay(val)
        },
        addRootTodo(newTodo) {
            const newChild = { id: id++, label: newTodo, progress: 0, children: [] };

            this.data5.push(newChild)
        },
        addTodo(node) {
            // console.log(data)
            const newChild = { id: id++, label: 'test', progress: 0, children: [] };
            // if (!data.children) {
            //     this.$set(data, 'children', []);
            // }
            // data.children.push(newChild);
            // let node = this.$refs.tree.getNode(data)
            this.$refs.tree.append(newChild, node)
            this.updateProgress(calNodeProgress(node), node)
            // var value = this.newTodo && this.newTodo.trim()
            // console.log(`newTodo ${value}`)
            // if (!value) {
            //     return
            // }
            // this.todos.push({
            //     id: todoStorage.uid++,
            //     title: value,
            //     completed: false,
            //     progress: 0
            // })
            // this.newTodo = ''
        },

        removeTodo(node, data) {
            let parent = node.parent;
            // const children = parent.data.children || parent.data;
            // const index = children.findIndex(d => d.id === data.id);
            // children.splice(index, 1);
            this.$refs.tree.remove(node)
            this.updateProgress(calNodeProgress(parent), parent)
            // this.todos.splice(this.todos.indexOf(todo), 1)
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
            // this.editedTodo = null
            // todo.title = this.beforeEditCache
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
