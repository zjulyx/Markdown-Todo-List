<template>
    <div>
        <el-container>
            <el-header style="text-align: center;">
                <el-tag type="danger" hit>
                    <i class="el-icon-edit"></i>
                    {{wholeData.title}}
                </el-tag>
            </el-header>
            <el-main style="width: 100%">
                <el-input clearable prefix-icon="el-icon-search" placeholder="Todo filter..." size="mini" v-model="filterText" v-if="wholeData[curDate]!==[]">
                </el-input>
                <el-tree :data="wholeData[curDate]" ref="tree" show-checkbox node-key="id" default-expand-all :expand-on-click-node="false" @check-change="handleCheckChange" :filter-node-method="filterNode" style="width: 100%">
                    <span slot-scope="{ node, data }">
                        <el-input :value="node.label" @change="val=>doneEdit(val, node, data)" size="mini">
                            <el-container slot="append">
                                <el-tooltip :content="showProgress(data.progress)" placement="top">
                                    <el-rate size="mini" v-model="data.progress" :max="MAXPROGRESS" @change="val=>{updateProgress(val,node)}" :disabled="!node.isLeaf" disabled-void-color="#C6D1DE" disabled-void-icon-class="el-icon-star-off"></el-rate>
                                </el-tooltip>
                            </el-container>
                        </el-input>
                        <span>
                            <el-button type="primary" icon="el-icon-circle-plus" @click="() => addTodo({node:node})" size="mini"></el-button>
                            <el-button type="danger" icon="el-icon-delete" @click="() => removeTodo(node, data)" size="mini"></el-button>
                        </span>
                    </span>
                </el-tree>
                <el-date-picker v-model="curDate" align="right" type="date" placeholder="Choose Date" :picker-options="pickerOptions" value-format="yyyy-MM-dd">
                </el-date-picker>
            </el-main>
            <el-footer>
                <el-input placeholder="Add new Todo" v-model="newTodo" @keyup.enter.native="addTodo({newTodo:newTodo})" clearable>
                </el-input>
            </el-footer>
        </el-container>
    </div>
</template>

<script>
import * as constants from "../../utils/constants";
import * as markdownParser from "../../utils/markdownParser";
import * as util from "../../utils/util";

let id

let calNodeProgress = function (node) {
    let childCount = node.childNodes.length
    if (childCount === 0) {
        return node.data.progress
    }
    let progressSum = 0
    for (let child of node.childNodes) {
        progressSum += child.data.progress
    }
    return progressSum / childCount
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
            filterText: '',
            wholeData: {},
            newTodo: '',
            curDate: util.FormatDateTime(new Date()),
            MAXPROGRESS: constants.MAXPROGRESS,
            pickerOptions: {
                disabledDate: time => {
                    return time.getTime() > Date.now();
                },
                shortcuts: [{
                    text: 'Today',
                    onClick(picker) {
                        picker.$emit('pick', new Date());
                    }
                }, {
                    text: 'Yesterday',
                    onClick(picker) {
                        const date = new Date();
                        date.setTime(date.getTime() - 3600 * 1000 * 24);
                        picker.$emit('pick', date);
                    }
                }, {
                    text: 'A Week Ago',
                    onClick(picker) {
                        const date = new Date();
                        date.setTime(date.getTime() - 3600 * 1000 * 24 * 7);
                        picker.$emit('pick', date);
                    }
                }, {
                    text: 'Copy To Today',
                    onClick: picker => {
                        const date = new Date();
                        let today = util.FormatDateTime(date)
                        if (today !== this.curDate) {
                            this.wholeData[today] = this.wholeData[this.curDate]
                            markdownParser.SaveMarkdownFile('test.md', this.wholeData)
                        }
                        picker.$emit('pick', date);
                    }
                }]
            }
        };
    },
    watch: {
        filterText(val) {
            this.$refs.tree.filter(val);
        },
        curDate: {
            handler: function (newCurDate) {
                // first make sure tree is loaded
                if (!(newCurDate in this.wholeData)) {
                    this.wholeData[newCurDate] = []
                    this.$nextTick(function () {
                        this.updateCheckStatusAtFirst(newCurDate)
                        markdownParser.SaveMarkdownFile('test.md', this.wholeData)
                    })
                }
            }
        }
    },
    mounted() {
        this.$nextTick(function () {
            markdownParser.LoadMarkdownFile('test.md', res => {
                this.wholeData = res
                id = markdownParser.curId
                if (!(this.curDate in this.wholeData)) {
                    this.wholeData[this.curDate] = []
                }
                this.updateCheckStatusAtFirst(this.curDate)
            })
        });
    },
    methods: {
        filterNode(value, data) {
            if (!value) return true;
            return data.label.indexOf(value) !== -1;
        },
        updateCheckStatusAtFirst(thisDate) {
            if (thisDate in this.wholeData) {
                for (let rootData of this.wholeData[thisDate]) {
                    updateCheckStatus(this.$refs.tree.getNode(rootData))
                }
            } else {
                this.wholeData[thisDate] = []
            }
        },
        handleCheckChange(data, checked, subchecked) {
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
            node.data.progress = newProgress
            node.data.finished = (newProgress === constants.MAXPROGRESS)
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
                markdownParser.SaveMarkdownFile('test.md', this.wholeData)
                return
            }

            this.updateProgress(calNodeProgress(parent), parent)
        },
        showProgress(val) {
            return util.ConvertProgressToDisplay(val)
        },
        addTodo({ newTodo = 'new todo...', node = this.$refs.tree.root }) {
            const newChild = { id: id++, label: newTodo, progress: 0, finished: false, children: [] };
            if (!(this.curDate in this.wholeData)) {
                this.wholeData[this.curDate] = []
            }
            this.$refs.tree.append(newChild, node)
            this.updateProgress(calNodeProgress(node), node)
        },
        removeTodo(node, data) {
            let parent = node.parent;
            this.$refs.tree.remove(node)
            this.updateProgress(calNodeProgress(parent), parent)
        },
        doneEdit: function (newval, node, data) {
            if (!newval) {
                this.removeTodo(node)
            }
            newval = newval.trim()
            data.label = newval
            markdownParser.SaveMarkdownFile('test.md', this.wholeData)
        }
    }
};
</script>

<style>
.el-margin-bottom {
  margin-bottom: 10px;
}
</style>
