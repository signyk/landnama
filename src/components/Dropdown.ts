export interface DropdownOption {
    label: string
    value: string
}

export interface DropdownOptions {
    options: DropdownOption[]
    placeholder?: string
    onChange: (value: string) => void
}

export function createDropdown(opts: DropdownOptions): {
    el: HTMLElement
    getValue: () => string
    setValue: (value: string) => void
} {
    const { options, placeholder = options[0]?.label ?? '', onChange } = opts
    let currentValue = options[0]?.value ?? ''

    const el = document.createElement('div')
    el.className = 'dropdown'

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'dropdown-btn'

    const label = document.createElement('span')
    label.className = 'dropdown-label'
    label.textContent = placeholder

    const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    chevron.setAttribute('viewBox', '0 0 10 6')
    chevron.setAttribute('width', '10')
    chevron.setAttribute('height', '6')
    chevron.classList.add('dropdown-chevron')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M0 0l5 6 5-6z')
    path.setAttribute('fill', 'currentColor')
    chevron.appendChild(path)

    btn.appendChild(label)
    btn.appendChild(chevron)

    const list = document.createElement('ul')
    list.className = 'dropdown-list hidden'

    for (const opt of options) {
        const item = document.createElement('li')
        item.className = 'dropdown-item'
        if (opt.value === currentValue) item.classList.add('active')
        item.dataset.value = opt.value
        item.textContent = opt.label
        item.addEventListener('click', () => {
            if (opt.value === currentValue) {
                close()
                return
            }
            currentValue = opt.value
            label.textContent = opt.label
            list.querySelectorAll('.dropdown-item').forEach((i) => i.classList.remove('active'))
            item.classList.add('active')
            close()
            onChange(currentValue)
        })
        list.appendChild(item)
    }

    el.appendChild(btn)
    el.appendChild(list)

    function open() {
        list.classList.remove('hidden')
        btn.classList.add('open')
    }

    function close() {
        list.classList.add('hidden')
        btn.classList.remove('open')
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (list.classList.contains('hidden')) open()
        else close()
    })

    document.addEventListener('click', (e) => {
        if (!el.contains(e.target as Node)) close()
    })

    return {
        el,
        getValue: () => currentValue,
        setValue: (value: string) => {
            const match = options.find((o) => o.value === value)
            if (!match) return
            currentValue = value
            label.textContent = match.label
            list.querySelectorAll<HTMLElement>('.dropdown-item').forEach((i) => {
                i.classList.toggle('active', i.dataset.value === value)
            })
        },
    }
}
