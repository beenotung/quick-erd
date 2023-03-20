abstract class StoredValue<T> {
  private _value: T
  protected abstract encode(value: T): string
  protected abstract decode(text: string): T
  constructor(protected key: string, protected defaultValue: T) {
    const text = localStorage.getItem(key)
    this._value = text == null ? defaultValue : this.decode(text)
  }
  watch(cb: (value: T) => void) {
    window.addEventListener('storage', event => {
      if (event.storageArea != localStorage || event.key != this.key) return
      const value =
        event.newValue == null ? this.defaultValue : this.decode(event.newValue)
      if (this._value == value) return
      this.value = value
      cb(value)
    })
  }
  // value is auto persisted
  set value(value: T) {
    if (value == this._value) return
    this._value = value
    this.save()
  }
  get value() {
    return this._value
  }
  // quick value is not persisted, intended to be saved in batch
  get quickValue() {
    return this._value
  }
  set quickValue(value: T) {
    this._value = value
  }
  save() {
    localStorage.setItem(this.key, this.encode(this._value))
  }
  remove() {
    localStorage.removeItem(this.key)
  }
  toString(): string {
    return this.encode(this._value)
  }
}

export class StoredString extends StoredValue<string> {
  protected encode(value: string): string {
    return value
  }
  protected decode(text: string): string {
    return text
  }
}

export class StoredBoolean extends StoredValue<boolean> {
  protected encode(value: boolean): string {
    return value ? 'true' : 'false'
  }
  protected decode(text: string): boolean {
    return text == 'true' ? true : text == 'false' ? false : this.defaultValue
  }
}

export class StoredNumber extends StoredValue<number> {
  protected encode(value: number): string {
    return value.toString()
  }
  protected decode(text: string): number {
    const number = parseFloat(text)
    return Number.isNaN(number) ? this.defaultValue : number
  }
}

export function cleanStorage() {
  for (let i = localStorage.length; i >= 0; i--) {
    const key = localStorage.key(i)
    if (key && localStorage.getItem(key) == '0') {
      delete localStorage[key]
    }
  }
}
