import { h, Component } from 'preact';

import { Stats } from './stats';
import { Screen } from './screen';
import { Options } from './options';
import { Editor } from './editor';
import { Explorer } from './explorer';
import { ApplicationState, initialApplicationState } from './state';

import * as bridge from '../bridge';
import * as simulator from '../simulator';

export class Application extends Component<{}, ApplicationState> {
  private explorer = new Explorer();

  constructor(props: {}) {
    super(props);
    this.state = {
      ...initialApplicationState(),
      explorer: this.explorer.state,
    };
  }

  private stats!: Stats;
  private screen!: Screen;
  private field!: simulator.Field;
  private pattern = simulator.compile(simulator.parse(''));

  componentDidMount() {
    this.field = new simulator.Field();
  }

  private update = (deltaStep: number) => {
    this.stats.internal.begin();

    if (!this.screen.control.isDragging) {
      if (this.state.cameraRevolve) this.screen.camera.targetPosition.x += 0.05;

      if (!this.state.isPaused) {
        this.field.update(deltaStep);
        this.screen.scene.history.putSnapshot(this.field, bridge.copyParticle);
        this.screen.scene.needsUpdate = true;

        if (this.field.closed) {
          if (this.state.generateAutomatically) this.generatePattern(false);
          const behavior = this.pattern([0, 1]);
          this.field.add(new simulator.Particle(behavior));
        }
      }
    }

    this.screen.update(deltaStep);

    this.stats.internal.end();
  };

  private togglePauseAndCameraRevolve = (ev: MouseEvent) => {
    ev.preventDefault();
    this.setState({
      isPaused: !this.state.isPaused,
      cameraRevolve: !this.state.cameraRevolve,
    });
  };

  private generationCount = 0;

  private generatePattern = (clear = true) => {
    ++this.generationCount;
    const program = simulator.generate(this.state.generatorStrength);
    const item =  `Generation ${this.generationCount}`;
    const code = simulator.print(program);
    this.explorer.save('history', item, code);
    this.setState({ explorer: this.explorer.state, editingItem: item, editingCode: code });
    this.updatePattern(code, clear);
  };

  private updatePattern = (code: string, clear = true) => {
    try {
      const program = simulator.parse(code);
      this.pattern = simulator.compile(program);
      if (clear) this.field.clear();
      this.setState({ editorNotification: 'Successfully compiled.' });

    } catch (e) {
      const message =
        (e instanceof simulator.ParseError) ?  `Parse error: ${e.message}` :
        (e instanceof simulator.CompileError) ?  `Compile error: ${e.message}` :
        `Unknown error: ${e.message}`;
      this.setState({ editorNotification: message });
    }
  };

  private handleSave = (store: string, item: string, code: string) => {
    this.explorer.save(store, item, code);
    this.setState({ explorer: this.explorer.state });
  };

  private handleLoad = (store: string, item: string) => {
    const code = this.explorer.load(store, item);
    this.setState({ editingItem: item, editingCode: code, generateAutomatically: false });
    this.updatePattern(code);
  };

  private handleDelete = (store: string, item: string) => {
    this.explorer.delete(store, item);
    this.setState({ explorer: this.explorer.state });
  };

  private handleReset = () => {
    this.field.clear();
  };

  render() {
    const { showStats, showEditor, stepsPerSecond } = this.state;
    return (
      <div className="application" onContextMenu={this.togglePauseAndCameraRevolve}>
        <Stats ref={s => this.stats = s} visible={showStats} />
        <Updater stepsPerSecond={stepsPerSecond} onUpdate={this.update} />
        <Screen
          ref={s => this.screen = s}
          {...this.state}
        />
        <Options
          onChange={s => this.setState(s as any)}
          {...this.state}
        />
        { showEditor ? (
          <Editor
            onChange={s => this.setState(s as any)}
            onSave={this.handleSave}
            onLoad={this.handleLoad}
            onDelete={this.handleDelete}
            onCommitCodeChange={this.updatePattern}
            onGenerate={this.generatePattern}
            onReset={this.handleReset}
            {...this.state}
          />
        ) : null }
      </div>
    );
  }
}

export class Updater extends Component<{
  stepsPerSecond: number;
  onUpdate(deltaStep: number): void;
}, {}> {
  private lastTime!: number;
  private requestId?: any;

  componentDidMount() {
    this.lastTime = performance.now();
    this.requestId = requestAnimationFrame(this.update);
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.requestId);
  }

  private update = () => {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.props.onUpdate(deltaTime / 1000 * this.props.stepsPerSecond);
    this.lastTime = currentTime;
    this.requestId = requestAnimationFrame(this.update);
  };

  render() {
    return null;
  }
}
