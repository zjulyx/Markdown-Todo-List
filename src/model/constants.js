import path from 'path'

export const MAXPROGRESS = 4
export const UserDataFile = path.join(process.env.APPDATA, 'MarkdownTodoList', 'UserData.json')

// vue data key
export const FilterText = 'FilterText'
export const TabsData = 'TabsData'
export const CurTab = 'CurTab'
export const CurDate = 'CurDate'
export const NewTodo = 'NewTodo'
export const TitleNotEditing = 'TitleNotEditing'
export const Content = 'Content'
export const FileName = 'FileName'
export const Files = 'Files'
