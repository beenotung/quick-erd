import { DiagramController } from './diagram'

export function openDialog(diagramController: DiagramController) {
  const dialog = document.createElement('dialog')
  dialog.style.zIndex = diagramController.getSafeZIndex().toString()
  dialog.setAttribute('open', '')
  document.body.appendChild(dialog)
  return dialog
}
