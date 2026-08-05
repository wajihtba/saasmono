'use client'

import { orpc } from '@/utils/orpc'
import {
  Button,
  Combobox,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxButton,
  ComboboxCommand,
  ComboboxInput,
  ComboboxList,
  ComboboxEmpty,
  ComboboxLoading,
  ComboboxGroup,
  ComboboxItem,
  ComboboxSeparator
} from '@repo/ui'
import { useQuery } from '@tanstack/react-query'
import { Building2, Users, X } from 'lucide-react'
import { TimetableFilterState } from './timetable-visualization'
import { useDebouncedSearch } from '@/lib/utils'

interface TimetableFiltersProps {
  filters: TimetableFilterState
  onFiltersChange: (filters: TimetableFilterState) => void
  groupClassroomsByLevel?: boolean // Optional: group classrooms by education level
  groupClassroomGroupsByClassroom?: boolean // Optional: group classroom groups by classroom
}

export function TimetableFilters({
  filters,
  onFiltersChange,
  groupClassroomsByLevel = true,
  groupClassroomGroupsByClassroom = true
}: TimetableFiltersProps) {
  // Debounced search for classrooms
  const classroomSearch = useDebouncedSearch({})

  // Debounced search for classroom groups
  const classroomGroupSearch = useDebouncedSearch({})

  // Get classrooms list with search
  const { data: classrooms = [], isLoading: isLoadingClassrooms } = useQuery(
    orpc.management.classroom.getClassroomsList.queryOptions({
      input: classroomSearch.shouldSearch
        ? { search: classroomSearch.debouncedSearchTerm }
        : undefined
    })
  )

  // Get classroom groups list with search
  const { data: classroomGroups = [], isLoading: isLoadingClassroomGroups } = useQuery(
    orpc.management.classroom.getClassroomGroupsList.queryOptions({
      input: classroomGroupSearch.shouldSearch
        ? { search: classroomGroupSearch.debouncedSearchTerm }
        : undefined
    })
  )

  // Limit initial results to 10 items when no search is active
  const displayedClassrooms = classroomSearch.shouldSearch
    ? classrooms
    : classrooms.slice(0, 10)

  const displayedClassroomGroups = classroomGroupSearch.shouldSearch
    ? classroomGroups
    : classroomGroups.slice(0, 10)

  const handleClassroomChange = (classroomId: string) => {
    if (classroomId === 'clear') {
      onFiltersChange({
        ...filters,
        classroomId: undefined,
      })
    } else {
      onFiltersChange({
        ...filters,
        classroomId,
        classroomGroupId: undefined, // Clear group when classroom is selected
      })
    }
  }

  const handleClassroomGroupChange = (classroomGroupId: string) => {
    if (classroomGroupId === 'clear') {
      onFiltersChange({
        ...filters,
        classroomGroupId: undefined,
      })
    } else {
      onFiltersChange({
        ...filters,
        classroomGroupId,
        classroomId: undefined, // Clear classroom when group is selected
      })
    }
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters = filters.classroomId || filters.classroomGroupId

  // Group classrooms by education level if enabled
  const groupedClassrooms = groupClassroomsByLevel
    ? displayedClassrooms.reduce((groups, classroom) => {
      // Classrooms without a level still belong in the list, just under a catch-all
      const level = classroom.educationLevel?.displayNameAr || 'بدون مستوى'
      if (!groups[level]) groups[level] = []
      groups[level].push(classroom)
      return groups
    }, {} as Record<string, typeof displayedClassrooms>)
    : null

  // Group classroom groups by classroom if enabled
  const groupedClassroomGroups = groupClassroomGroupsByClassroom
    ? displayedClassroomGroups.reduce((groups, group) => {
      const classroomName = `${group.classroomName} - ${group.classroomAcademicYear}`
      if (!groups[classroomName]) groups[classroomName] = []
      groups[classroomName].push(group)
      return groups
    }, {} as Record<string, typeof displayedClassroomGroups>)
    : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Classroom Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            الفصل الدراسي
          </label>
          <Combobox>
            <ComboboxTrigger asChild>
              <ComboboxButton
                placeholder="اختر فصل دراسي"
                clearable={true}
                onClear={() => handleClassroomChange('clear')}
                selectedLabel={
                  filters.classroomId
                    ? classrooms.find(c => c.id === filters.classroomId)?.name
                    : undefined
                }
              />
            </ComboboxTrigger>
            <ComboboxContent>
              <ComboboxCommand>
                <ComboboxInput
                  placeholder="البحث في الفصول..."
                  onValueChange={classroomSearch.setSearchTerm}
                />
                <ComboboxList>
                  {isLoadingClassrooms ? (
                    <ComboboxLoading>جاري التحميل...</ComboboxLoading>
                  ) : (
                    <ComboboxEmpty>لا توجد فصول مطابقة</ComboboxEmpty>
                  )}

                  {/* Clear option (ungrouped) */}
                  {filters.classroomId && (
                    <>
                      <ComboboxGroup>
                        <ComboboxItem
                          onSelect={() => handleClassroomChange('clear')}
                          className="text-muted-foreground"
                        >
                          <div className="flex items-center gap-2">
                            <X className="h-4 w-4" />
                            مسح الاختيار
                          </div>
                        </ComboboxItem>
                      </ComboboxGroup>
                      <ComboboxSeparator />
                    </>
                  )}

                  {/* Grouped by education level */}
                  {groupedClassrooms ? (
                    Object.entries(groupedClassrooms).map(([level, classrooms]) => (
                      <ComboboxGroup key={level} heading={level}>
                        {classrooms.map((classroom) => (
                          <ComboboxItem
                            key={classroom.id}
                            id={classroom.id}
                            searchValue={`${classroom.name} ${classroom.educationLevel?.displayNameAr} ${classroom.academicYear}`}
                            selected={filters.classroomId === classroom.id}
                            onSelect={() => handleClassroomChange(classroom.id)}
                          >
                            <div className="flex flex-col">
                              <span>{classroom.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {classroom.academicYear}
                              </span>
                            </div>
                          </ComboboxItem>
                        ))}
                      </ComboboxGroup>
                    ))
                  ) : (
                    /* Ungrouped list */
                    <ComboboxGroup>
                      {displayedClassrooms.map((classroom) => (
                        <ComboboxItem
                          key={classroom.id}
                          id={classroom.id}
                          searchValue={`${classroom.name} ${classroom.educationLevel?.displayNameAr} ${classroom.academicYear}`}
                          selected={filters.classroomId === classroom.id}
                          onSelect={() => handleClassroomChange(classroom.id)}
                        >
                          <div className="flex flex-col">
                            <span>{classroom.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {classroom.educationLevel?.displayNameAr} - {classroom.academicYear}
                            </span>
                          </div>
                        </ComboboxItem>
                      ))}
                    </ComboboxGroup>
                  )}
                </ComboboxList>
              </ComboboxCommand>
            </ComboboxContent>
          </Combobox>
        </div>

        {/* Classroom Group Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            مجموعة الفصل
          </label>
          <Combobox>
            <ComboboxTrigger asChild>
              <ComboboxButton
                placeholder="اختر مجموعة"
                clearable={true}
                onClear={() => handleClassroomGroupChange('clear')}
                selectedLabel={
                  filters.classroomGroupId
                    ? classroomGroups.find(g => g.id === filters.classroomGroupId)?.name
                    : undefined
                }
                disabled={classroomGroups.length === 0}
              />
            </ComboboxTrigger>
            <ComboboxContent>
              <ComboboxCommand>
                <ComboboxInput
                  placeholder="البحث في المجموعات..."
                  onValueChange={classroomGroupSearch.setSearchTerm}
                />
                <ComboboxList>
                  {isLoadingClassroomGroups ? (
                    <ComboboxLoading>جاري التحميل...</ComboboxLoading>
                  ) : (
                    <ComboboxEmpty>
                      {classroomGroups.length === 0 ? "لا توجد مجموعات متاحة" : "لا توجد مجموعات مطابقة"}
                    </ComboboxEmpty>
                  )}

                  {/* Clear option (ungrouped) */}
                  {filters.classroomGroupId && (
                    <>
                      <ComboboxGroup>
                        <ComboboxItem
                          onSelect={() => handleClassroomGroupChange('clear')}
                          className="text-muted-foreground"
                        >
                          <div className="flex items-center gap-2">
                            <X className="h-4 w-4" />
                            مسح الاختيار
                          </div>
                        </ComboboxItem>
                      </ComboboxGroup>
                      <ComboboxSeparator />
                    </>
                  )}

                  {/* Grouped by classroom */}
                  {groupedClassroomGroups ? (
                    Object.entries(groupedClassroomGroups).map(([classroomName, groups]) => (
                      <ComboboxGroup key={classroomName} heading={classroomName}>
                        {groups.map((group) => (
                          <ComboboxItem
                            key={group.id}
                            id={group.id}
                            searchValue={`${group.name} ${group.classroomName} ${group.classroomAcademicYear}`}
                            selected={filters.classroomGroupId === group.id}
                            onSelect={() => handleClassroomGroupChange(group.id)}
                          >
                            {group.name}
                          </ComboboxItem>
                        ))}
                      </ComboboxGroup>
                    ))
                  ) : (
                    /* Ungrouped list */
                    <ComboboxGroup>
                      {displayedClassroomGroups.map((group) => (
                        <ComboboxItem
                          key={group.id}
                          id={group.id}
                          searchValue={`${group.name} ${group.classroomName} ${group.classroomAcademicYear}`}
                          selected={filters.classroomGroupId === group.id}
                          onSelect={() => handleClassroomGroupChange(group.id)}
                        >
                          <div className="flex flex-col">
                            <span>{group.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {group.classroomName} - {group.classroomAcademicYear}
                            </span>
                          </div>
                        </ComboboxItem>
                      ))}
                    </ComboboxGroup>
                  )}
                </ComboboxList>
              </ComboboxCommand>
            </ComboboxContent>
          </Combobox>
        </div>

        {/* Clear Filters Button — only worth showing once something is filtered */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <label className="hidden text-sm font-medium text-transparent md:flex">
              الإجراءات
            </label>
            <Button
              variant="outline"
              onClick={clearAllFilters}
              className="h-11 w-full md:h-12"
            >
              <X className="h-4 w-4 me-1" />
              مسح جميع الفلاتر
            </Button>
          </div>
        )}
      </div>

      {/* Active Filters Display — the combobox already shows the selection on
          mobile, so the chips are only worth the space from md up */}
      {hasActiveFilters && (
        <div className="hidden border-t pt-4 md:block">
          <div className="text-sm text-muted-foreground mb-2">الفلاتر النشطة:</div>
          <div className="flex flex-wrap gap-2">
            {filters.classroomId && (
              <div className="bg-primary/10 text-primary flex items-center gap-1 rounded-md px-2 py-1 text-xs">
                <Building2 className="h-3 w-3" />
                <span>
                  فصل: {classrooms.find(c => c.id === filters.classroomId)?.name || 'غير معروف'}
                </span>
                <button
                  onClick={() => handleClassroomChange('clear')}
                  className="hover:bg-primary/20 ms-1 rounded-sm p-0.5"
                >
                  <X className="h-2 w-2" />
                </button>
              </div>
            )}
            {filters.classroomGroupId && (
              <div className="bg-primary/10 text-primary flex items-center gap-1 rounded-md px-2 py-1 text-xs">
                <Users className="h-3 w-3" />
                <span>
                  مجموعة: {classroomGroups.find(g => g.id === filters.classroomGroupId)?.name || 'غير معروف'}
                </span>
                <button
                  onClick={() => handleClassroomGroupChange('clear')}
                  className="hover:bg-primary/20 ms-1 rounded-sm p-0.5"
                >
                  <X className="h-2 w-2" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}