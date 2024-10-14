import { View, $ } from '../../common';
import { appendStyles } from '../../utils/mixins';
import EditorModel from '../model/Editor';

export default class EditorView extends View<EditorModel> {
  constructor(model: EditorModel) {
    super({ model });
    const { Panels, UndoManager } = model;
    model.view = this;
    model.once('change:ready', () => {
      Panels.active();
      Panels.disableButtons();
      UndoManager.clear();

      if (model.getConfig().telemetry) {
        this.sendTelemetryData();
      }

      setTimeout(() => {
        model.trigger('load', model.Editor);
        model.clearDirtyCount();
      });
    });
  }

  render() {
    const { $el, model } = this;
    const { Panels, Canvas, config, modules } = model;
    const pfx = config.stylePrefix;
    const classNames = [`${pfx}editor`];
    !config.customUI && classNames.push(`${pfx}one-bg ${pfx}two-color`);

    const contEl = $(config.el || `body ${config.container}`);
    config.cssIcons && appendStyles(config.cssIcons, { unique: true, prepand: true });
    $el.empty();

    config.width && contEl.css('width', config.width);
    config.height && contEl.css('height', config.height);

    $el.append(Canvas.render());
    $el.append(Panels.render());

    // Load shallow editor
    const { shallow } = model;
    const shallowCanvasEl = shallow.Canvas.render();
    shallowCanvasEl.style.display = 'none';
    $el.append(shallowCanvasEl);

    $el.attr('class', classNames.join(' '));
    contEl.addClass(`${pfx}editor-cont`).empty().append($el);
    modules.forEach((md) => md.postRender?.(this));

    return this;
  }

  private sendTelemetryData() {
    const hostName = window.location.hostname;

    // @ts-ignore
    const enableDevTelemetry = __ENABLE_TELEMETRY_LOCALHOST__;

    if (!enableDevTelemetry && (hostName === 'localhost' || hostName.includes('localhost'))) {
      // Don't send telemetry data for localhost
      return;
    }

    const sessionKeyPrefix = 'gjs_telemetry_sent_';

    // @ts-ignore
    const version = __GJS_VERSION__;
    const sessionKey = `${sessionKeyPrefix}${version}`;

    if (sessionStorage.getItem(sessionKey)) {
      // Telemetry already sent for version this session
      return;
    }

    // @ts-ignore
    const url = __STUDIO_URL__;
    const path = '/api/gjs/telemetry/collect';

    (async () => {
      const response = await fetch(`${url}${path}`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'EDITOR:LOAD',
          domain: hostName,
          version,
          url,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send telemetry data ${await response.text()}`);
      }

      sessionStorage.setItem(sessionKey, 'true');

      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith(sessionKeyPrefix) && key !== sessionKey) {
          sessionStorage.removeItem(key);
        }
      });

      this.trigger('telemetry:sent');
    })().catch(() => {
      // Silently fail
    });
  }
}
