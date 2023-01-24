abstract class StoredValue<T> {
  private _value: T
  protected abstract encode(value: T): string
  protected abstract decode(text: string): T
  constructor(protected key: string, protected defaultValue: T) {
    const text = localStorage.getItem(key)
    this._value = text == null ? defaultValue : this.decode(text)
  }
  set value(value: T) {
    if (value == this._value) return
    this._value = value
    localStorage.setItem(this.key, this.encode(value))
  }
  get value() {
    return this._value
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
