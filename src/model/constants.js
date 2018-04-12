import path from 'path'

export const MAXPROGRESS = 4
export const UserDataFile = path.join(process.env.APPDATA, 'MarkdownTodoList', 'UserData.json')

export const FilterText = 'FilterText'
export const TabsData = 'TabsData'
export const CurTab = 'CurTab'
export const CurDate = 'CurDate'
export const CurId = 'CurId'
export const NewTodo = 'NewTodo'
export const Title = 'Title'
export const TitleNotEditing = 'TitleNotEditing'
export const Content = 'Content'
export const FileName = 'FileName'
export const Files = 'Files'
export const OnlyShowContentDate = 'OnlyShowContentDate'

export const FileOpenedChannel = "FileOpenedChannel"
export const FileSaveChannel = "FileSaveChannel"
export const FileSavedChannel = "FileSavedChannel"
export const ToggleSwitchChannel = "ToggleSwitchChannel"

export const DialogTypes = {
    info: "info",
    warning: "warning",
    error: "error",
    question: "question"
}
