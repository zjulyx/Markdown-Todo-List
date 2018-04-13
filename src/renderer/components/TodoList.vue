<template>
    <div>
        <el-tabs v-model="CurTab" type="card" editable @edit="handleTabsEdit" @dblclick.native="handleTabsEdit(CurTab, 'remove')" @click.middle.native="handleTabsEdit(CurTab, 'remove')">
            <el-tab-pane :key="index" v-for="(item,index) in TabsData" :label="item.FileName" :name="index.toString()">
                <el-tag type="danger" hit @dblclick.native="handleTitleEdit" v-if="TitleNotEditing">
                    <i class="el-icon-tickets"></i>
                    {{item.Content.Title}} (Double click to edit)
                </el-tag>
                <el-input prefix-icon="el-icon-edit" :value="item.Content.Title" @blur="event=>titleEdited(event.target.value)" @change="val=>titleEdited(val)" v-else>
                </el-input>
                <el-input clearable prefix-icon="el-icon-search" placeholder="Todo filter..." size="mini" v-model="FilterText" v-if="!item.Content[item.CurDate] || item.Content[item.CurDate].length!==0">
                </el-input>
                <el-tree :data="item.Content[item.CurDate]" ref="tree" show-checkbox node-key="id" default-expand-all :expand-on-click-node="false" @check-change="handleCheckChange" :filter-node-method="filterNode" style="width: 100%">
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
                <el-date-picker v-model="item.CurDate" align="right" type="date" placeholder="Choose Date" :picker-options="pickerOptions" value-format="yyyy-MM-dd">
                </el-date-picker>
                <el-input placeholder="Add new Todo" v-model="item.NewTodo" @keyup.enter.native="addTodo({NewTodo:item.NewTodo})" clearable>
                </el-input>
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script>
import Vue from 'vue'

import * as constants from "../../model/constants";
import * as fileOperation from "../../utils/fileOperation";
import * as util from "../../utils/util";
import * as vux from "../store/vuxOperation";

import { ipcRenderer, remote } from 'electron'

let initSharedData = JSON.parse(JSON.stringify(remote.getGlobal('sharedData')))

let TodoList = {
    name: "todo-list",
    data() {
        return {
            TabsData: initSharedData.TabsData,
            Files: initSharedData.Files,
            TitleNotEditing: true,
            MAXPROGRESS: constants.MAXPROGRESS,
            FilterDate: true,
            pickerOptions: {
                disabledDate: time => {
                    if (GetOnlyShowContentDate()) {
                        let sTime = util.FormatDateTime(time)
                        return time.getTime() > Date.now() || !(sTime in this.TabsData[this.CurTab].Content) || this.TabsData[this.CurTab].Content[sTime].length === 0
                    } else {
                        return time.getTime() > Date.now()
                    }
                },
                firstDayOfWeek: 1,
                shortcuts: [
                    {
                        text: 'Today',
                        onClick(picker) {
                            picker.$emit('pick', new Date());
                        }
                    },
                    {
                        text: 'Yesterday',
                        onClick(picker) {
                            const date = new Date();
                            date.setTime(date.getTime() - 3600 * 1000 * 24);
                            picker.$emit('pick', date);
                        }
                    },
                    {
                        text: 'A Week Ago',
                        onClick(picker) {
                            const date = new Date();
                            date.setTime(date.getTime() - 3600 * 1000 * 24 * 7);
                            picker.$emit('pick', date);
                        }
                    },
                    {
                        text: 'Copy To Today',
                        onClick: picker => {
                            const date = new Date();
                            let today = util.FormatDateTime(date)
                            if (today !== this.CurDate) {
                                Vue.set(this.TabsData[this.CurTab].Content, today, this.TabsData[this.CurTab].Content[this.CurDate])
                                SaveMarkdownFile()
                            }
                            picker.$emit('pick', date);
                        }
                    }]
            }
        };
    },
    computed: {
        CurDate() {
            return this.TabsData[this.CurTab].CurDate
        },
        CurTab: {
            set(newData) {
                SetCurTab(newData)
                this.updateCheckStatusAtFirst(this.CurDate)
            },
            get() {
                return GetCurTab();
            }
        },
        FilterText: {
            set(newData) {
                this.TabsData[this.CurTab].FilterText = newData
            },
            get() {
                let curData = this.TabsData[this.CurTab].FilterText
                if (this.$refs.tree && this.$refs.tree[this.CurTab]) {
                    this.$refs.tree[this.CurTab].filter(curData);
                }
                return curData;
            }
        }
    },
    watch: {
        CurDate(newData) {
            this.updateCheckStatusAtFirst(newData)
        }
    },
    mounted() {
        this.updateCheckStatusAtFirst(this.CurDate)
        SaveUserDataFile()
    },
    methods: {
        handleTitleEdit() {
            this.TitleNotEditing = false
        },
        titleEdited(newTitle) {
            this.TitleNotEditing = true
            this.TabsData[this.CurTab].Content.Title = newTitle
            SaveMarkdownFile()
        },
        handleTabsEdit(targetName, action) {
            if (action === 'add') {
                ipcRenderer.send(constants.FileOpenChannel)
            }
            if (action === 'remove') {
                this.TabsData.splice(parseInt(targetName), 1)
                this.Files.splice(parseInt(targetName), 1)
                if (this.CurTab >= this.TabsData.length - 1) {
                    SetCurTab((this.TabsData.length - 1).toString())
                }
                SaveUserDataFile()
            }
        },
        filterNode(value, data) {
            if (!value) return true;
            return data.label.indexOf(value) !== -1;
        },
        updateCheckStatusAtFirst(thisDate) {
            if (thisDate in this.TabsData[this.CurTab].Content) {
                for (let rootData of this.TabsData[this.CurTab].Content[thisDate]) {
                    this.$nextTick(function () {
                        UpdateCheckStatus(this.$refs.tree[this.CurTab].getNode(rootData))
                    })
                }
            } else {
                Vue.set(this.TabsData[this.CurTab].Content, thisDate, [])
                SaveMarkdownFile()
            }
        },
        handleCheckChange(data, checked, subchecked) {
            let node = this.$refs.tree[this.CurTab].getNode(data)
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
            let parent = node.parent
            if (!parent) {
                // root node, have no progress/finished prop
                SaveMarkdownFile()
                return
            }

            node.data = node.data
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
            this.updateProgress(CalNodeProgress(parent), parent)
        },
        showProgress(val) {
            return util.ConvertProgressToDisplay(val)
        },
        addTodo({ NewTodo = 'new todo...', node = this.$refs.tree[this.CurTab].root }) {
            const newChild = GenerateInitData(NewTodo)
            if (!(this.CurDate in this.TabsData[this.CurTab].Content)) {
                Vue.set(this.TabsData[this.CurTab].Content, this.CurDate, [])
            }
            this.$refs.tree[this.CurTab].append(newChild, node)
            this.updateProgress(CalNodeProgress(node), node)
        },
        removeTodo(node, data) {
            let parent = node.parent;
            this.$refs.tree[this.CurTab].remove(node)
            this.updateProgress(CalNodeProgress(parent), parent)
        },
        doneEdit: function (newval, node, data) {
            if (!newval) {
                this.removeTodo(node)
                return
            }
            newval = newval.trim()
            data.label = newval
            SaveMarkdownFile()
        }
    }
};

export default TodoList;

function IncreaseCurId() {
    let curId = vux.GetVuxData(constants.CurId)
    curId++
    vux.SetVuxData(curId, constants.CurId)
    return curId
}

function GenerateInitData(label) {
    return { id: IncreaseCurId(), label: label, progress: 0, finished: false, children: [] }
}

function CalNodeProgress(node) {
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

function UpdateCheckStatus(node) {
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
        UpdateCheckStatus(child)
    }
}

function SaveMarkdownFile() {
    let curTab = GetCurTab()
    let tabsData = TodoList.data().TabsData
    let filename = tabsData[curTab].FileName
    let content = tabsData[curTab].Content
    fileOperation.SaveMarkdownFile(filename, content)
}

function SaveUserDataFile() {
    let files = TodoList.data().Files
    let curTab = GetCurTab()
    let onlyShowContentDate = GetOnlyShowContentDate()
    fileOperation.SaveUserDataFile(constants.UserDataFile, {
        Files: files,
        CurTab: curTab,
        OnlyShowContentDate: onlyShowContentDate
    })
}

function GetCurTab() {
    return vux.GetVuxData(constants.CurTab)
}

function SetCurTab(newData) {
    vux.SetVuxData(newData, constants.CurTab)
    SaveUserDataFile()
}

function GetOnlyShowContentDate() {
    return vux.GetVuxData(constants.OnlyShowContentDate)
}

function SetOnlyShowContentDate(newData) {
    vux.SetVuxData(newData, constants.OnlyShowContentDate)
    SaveUserDataFile()
}

function FilterDuplicateFiles(currentFiles, newFiles, findDupCallback) {
    let res = []
    newFiles.forEach(item => {
        let curIndex = currentFiles.indexOf(item)
        if (curIndex === -1) {
            res.push(item)
        } else {
            findDupCallback(curIndex.toString())
        }
    })
    return res
}

ipcRenderer.on(constants.FileOpenedChannel, (evt, Files) => {
    let tempTabsData = TodoList.data().TabsData
    let tempFiles = TodoList.data().Files
    let originLength = tempTabsData.length
    let originFileLength = tempFiles.length
    let count = 0
    Files = FilterDuplicateFiles(tempFiles, Files, (newCurTab) => {
        SetCurTab(newCurTab)
    })
    let handleResult = function (file, index) {
        return function (res, cancelled) {
            if (!cancelled) {
                tempTabsData[index + originLength] = util.GenerateNewTabData(file, res)
                tempFiles[index + originFileLength] = file
            }
            if (++count === Files.length) {
                // global.sharedData[constants.CurId] = markdownParser.CurId
                tempTabsData = util.RemoveNullElementFromArray(tempTabsData)
                tempFiles = util.RemoveNullElementFromArray(tempFiles)
                tempTabsData.forEach((item, curIndex) => {
                    Vue.set(tempTabsData, curIndex, tempTabsData[curIndex])
                })
                tempFiles.forEach((item, curIndex) => {
                    Vue.set(tempFiles, curIndex, tempFiles[curIndex])
                })
                SetCurTab((tempTabsData.length - 1).toString())
            }
        }
    }
    Files.forEach((file, index) => {
        fileOperation.LoadMarkdownFile(file, handleResult(file, index))
    })
})

ipcRenderer.on(constants.ToggleSwitchChannel, (evt, menuItem) => {
    SetOnlyShowContentDate(menuItem.checked)
})
</script>

<style>
.el-margin-bottom {
  margin-bottom: 10px;
}
</style>
