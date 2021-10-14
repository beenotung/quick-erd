export class StoredValue<T> {
  private _value: T
  constructor(public key: string, defaultValue: T) {
    const text = localStorage.getItem(key)
    if (text) {
      this._value = JSON.parse(text)
    } else {
      this._value = defaultValue
    }
  }
  set value(value: T) {
    this._value = value
    const text = JSON.stringify(value)
    localStorage.setItem(this.key, text)
  }
  get value() {
    return this._value
  }
}
