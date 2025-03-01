/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {animate, AnimationBuilder, state, style, transition, trigger} from '@angular/animations';
import {DOCUMENT, isPlatformServer, PlatformLocation, ɵgetDOM as getDOM} from '@angular/common';
import {HTTP_INTERCEPTORS, HttpClient, HttpClientModule, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {ApplicationRef, CompilerFactory, Component, destroyPlatform, getPlatform, HostBinding, HostListener, importProvidersFrom, Inject, Injectable, Input, NgModule, NgZone, OnInit, PLATFORM_ID, PlatformRef, Type, ViewEncapsulation} from '@angular/core';
import {inject, waitForAsync} from '@angular/core/testing';
import {BrowserModule, makeStateKey, Title, TransferState} from '@angular/platform-browser';
import {BEFORE_APP_SERIALIZED, INITIAL_CONFIG, platformDynamicServer, PlatformState, renderModule, renderModuleFactory, ServerModule, ServerTransferStateModule} from '@angular/platform-server';
import {Observable} from 'rxjs';
import {first} from 'rxjs/operators';

import {renderApplication} from '../src/utils';

function createMyServerApp(standalone: boolean) {
  @Component({
    standalone,
    selector: 'app',
    template: `Works!`,
  })
  class MyServerApp {
  }
  return MyServerApp;
}

const MyServerApp = createMyServerApp(false);
const MyServerAppStandalone = createMyServerApp(true);

@NgModule({
  declarations: [MyServerApp],
  exports: [MyServerApp],
})
export class MyServerAppModule {
}

@NgModule({
  bootstrap: [MyServerApp],
  imports: [MyServerAppModule, ServerModule],
})
class ExampleModule {
}

function getTitleRenderHook(doc: any) {
  return () => {
    // Set the title as part of the render hook.
    doc.title = 'RenderHook';
  };
}

function exceptionRenderHook() {
  throw new Error('error');
}

function getMetaRenderHook(doc: any) {
  return () => {
    // Add a meta tag before rendering the document.
    const metaElement = doc.createElement('meta');
    metaElement.setAttribute('name', 'description');
    doc.head.appendChild(metaElement);
  };
}

function getAsyncTitleRenderHook(doc: any) {
  return () => {
    // Async set the title as part of the render hook.
    return new Promise<void>(resolve => {
      setTimeout(() => {
        doc.title = 'AsyncRenderHook';
        resolve();
      });
    });
  };
}

function asyncRejectRenderHook() {
  return () => {
    return new Promise<void>((_resolve, reject) => {
      setTimeout(() => {
        reject('reject');
      });
    });
  };
}

const RenderHookProviders = [
  {provide: BEFORE_APP_SERIALIZED, useFactory: getTitleRenderHook, multi: true, deps: [DOCUMENT]}
];

@NgModule({
  bootstrap: [MyServerApp],
  imports:
      [MyServerAppModule, BrowserModule.withServerTransition({appId: 'render-hook'}), ServerModule],
  providers: [...RenderHookProviders],
})
class RenderHookModule {
}

const MultiRenderHookProviders = [
  {provide: BEFORE_APP_SERIALIZED, useFactory: getTitleRenderHook, multi: true, deps: [DOCUMENT]},
  {provide: BEFORE_APP_SERIALIZED, useValue: exceptionRenderHook, multi: true},
  {provide: BEFORE_APP_SERIALIZED, useFactory: getMetaRenderHook, multi: true, deps: [DOCUMENT]},
];

@NgModule({
  bootstrap: [MyServerApp],
  imports:
      [MyServerAppModule, BrowserModule.withServerTransition({appId: 'render-hook'}), ServerModule],
  providers: [...MultiRenderHookProviders],
})
class MultiRenderHookModule {
}

const AsyncRenderHookProviders = [
  {
    provide: BEFORE_APP_SERIALIZED,
    useFactory: getAsyncTitleRenderHook,
    multi: true,
    deps: [DOCUMENT]
  },
];

@NgModule({
  bootstrap: [MyServerApp],
  imports:
      [MyServerAppModule, BrowserModule.withServerTransition({appId: 'render-hook'}), ServerModule],
  providers: [...AsyncRenderHookProviders],
})
class AsyncRenderHookModule {
}

const AsyncMultiRenderHookProviders = [
  {provide: BEFORE_APP_SERIALIZED, useFactory: getMetaRenderHook, multi: true, deps: [DOCUMENT]},
  {
    provide: BEFORE_APP_SERIALIZED,
    useFactory: getAsyncTitleRenderHook,
    multi: true,
    deps: [DOCUMENT]
  },
  {provide: BEFORE_APP_SERIALIZED, useFactory: asyncRejectRenderHook, multi: true},
];

@NgModule({
  bootstrap: [MyServerApp],
  imports:
      [MyServerAppModule, BrowserModule.withServerTransition({appId: 'render-hook'}), ServerModule],
  providers: [...AsyncMultiRenderHookProviders],
})
class AsyncMultiRenderHookModule {
}

@Component({selector: 'app', template: `Works too!`})
class MyServerApp2 {
}

@NgModule({declarations: [MyServerApp2], imports: [ServerModule], bootstrap: [MyServerApp2]})
class ExampleModule2 {
}

@Component({selector: 'app', template: ``})
class TitleApp {
  constructor(private title: Title) {}
  ngOnInit() {
    this.title.setTitle('Test App Title');
  }
}

@NgModule({declarations: [TitleApp], imports: [ServerModule], bootstrap: [TitleApp]})
class TitleAppModule {
}

function createMyAsyncServerApp(standalone: boolean) {
  @Component({
    selector: 'app',
    template: '{{text}}<h1 [textContent]="h1"></h1>',
    standalone,
  })
  class MyAsyncServerApp {
    text = '';
    h1 = '';

    @HostListener('window:scroll')
    track() {
      console.error('scroll');
    }

    ngOnInit() {
      Promise.resolve(null).then(() => setTimeout(() => {
                                   this.text = 'Works!';
                                   this.h1 = 'fine';
                                 }, 10));
    }
  }
  return MyAsyncServerApp;
}

const MyAsyncServerApp = createMyAsyncServerApp(false);
const MyAsyncServerAppStandalone = createMyAsyncServerApp(true);

@NgModule({
  declarations: [MyAsyncServerApp],
  imports: [BrowserModule.withServerTransition({appId: 'async-server'}), ServerModule],
  bootstrap: [MyAsyncServerApp]
})
class AsyncServerModule {
}

function createSVGComponent(standalone: boolean) {
  @Component({
    selector: 'app',
    template: '<svg><use xlink:href="#clear"></use></svg>',
    standalone,
  })
  class SVGComponent {
  }
  return SVGComponent;
}

const SVGComponent = createSVGComponent(false);
const SVGComponentStandalone = createSVGComponent(true);

@NgModule({
  declarations: [SVGComponent],
  imports: [BrowserModule.withServerTransition({appId: 'svg-server'}), ServerModule],
  bootstrap: [SVGComponent]
})
class SVGServerModule {
}

function createMyAnimationApp(standalone: boolean) {
  @Component({
    standalone,
    selector: 'app',
    template: `
  <div [@myAnimation]="state">
    <svg *ngIf="true"></svg>
    {{text}}
  </div>`,
    animations: [trigger(
        'myAnimation',
        [
          state('void', style({'opacity': '0'})),
          state('active', style({
                  'opacity': '1',                       // simple supported property
                  'font-weight': 'bold',                // property with dashed name
                  'transform': 'translate3d(0, 0, 0)',  // not natively supported by Domino
                })),
          transition('void => *', [animate('0ms')]),
        ],
        )]
  })
  class MyAnimationApp {
    state = 'active';
    constructor(private builder: AnimationBuilder) {}

    text = 'Works!';
  }
  return MyAnimationApp;
}

const MyAnimationApp = createMyAnimationApp(false);
const MyAnimationAppStandalone = createMyAnimationApp(true);

@NgModule({
  declarations: [MyAnimationApp],
  imports: [BrowserModule.withServerTransition({appId: 'anim-server'}), ServerModule],
  bootstrap: [MyAnimationApp]
})
class AnimationServerModule {
}

function createMyStylesApp(standalone: boolean) {
  @Component({
    standalone,
    selector: 'app',
    template: `<div>Works!</div>`,
    styles: ['div {color: blue; } :host { color: red; }']
  })
  class MyStylesApp {
  }
  return MyStylesApp;
}

const MyStylesApp = createMyStylesApp(false);
const MyStylesAppStandalone = createMyStylesApp(true);

@NgModule({
  declarations: [MyStylesApp],
  imports: [BrowserModule.withServerTransition({appId: 'example-styles'}), ServerModule],
  bootstrap: [MyStylesApp]
})
class ExampleStylesModule {
}

@NgModule({
  bootstrap: [MyServerApp],
  imports: [MyServerAppModule, ServerModule, HttpClientModule, HttpClientTestingModule],
})
export class HttpClientExampleModule {
}

@Injectable()
export class MyHttpInterceptor implements HttpInterceptor {
  constructor(private http: HttpClient) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req);
  }
}

@NgModule({
  bootstrap: [MyServerApp],
  imports: [MyServerAppModule, ServerModule, HttpClientModule, HttpClientTestingModule],
  providers: [
    {provide: HTTP_INTERCEPTORS, multi: true, useClass: MyHttpInterceptor},
  ],
})
export class HttpInterceptorExampleModule {
}

@Component({selector: 'app', template: `<img [src]="'link'">`})
class ImageApp {
}

@NgModule({declarations: [ImageApp], imports: [ServerModule], bootstrap: [ImageApp]})
class ImageExampleModule {
}

function createShadowDomEncapsulationApp(standalone: boolean) {
  @Component({
    standalone,
    selector: 'app',
    template: 'Shadow DOM works',
    encapsulation: ViewEncapsulation.ShadowDom,
    styles: [':host { color: red; }']
  })
  class ShadowDomEncapsulationApp {
  }
  return ShadowDomEncapsulationApp;
}

const ShadowDomEncapsulationApp = createShadowDomEncapsulationApp(false);
const ShadowDomEncapsulationAppStandalone = createShadowDomEncapsulationApp(true);

@NgModule({
  declarations: [ShadowDomEncapsulationApp],
  imports: [BrowserModule.withServerTransition({appId: 'test'}), ServerModule],
  bootstrap: [ShadowDomEncapsulationApp]
})
class ShadowDomExampleModule {
}

function createFalseAttributesComponents(standalone: boolean) {
  @Component({
    standalone,
    selector: 'my-child',
    template: 'Works!',
  })
  class MyChildComponent {
    // TODO(issue/24571): remove '!'.
    @Input() public attr!: boolean;
  }

  @Component({
    standalone,
    selector: 'app',
    template: '<my-child [attr]="false"></my-child>',
    imports: standalone ? [MyChildComponent] : [],
  })
  class MyHostComponent {
  }
  return [MyHostComponent, MyChildComponent];
}

const [MyHostComponent, MyChildComponent] = createFalseAttributesComponents(false);
const [MyHostComponentStandalone, _] = createFalseAttributesComponents(true);

@NgModule({
  declarations: [MyHostComponent, MyChildComponent],
  bootstrap: [MyHostComponent],
  imports: [ServerModule, BrowserModule.withServerTransition({appId: 'false-attributes'})]
})
class FalseAttributesModule {
}

@Component({selector: 'app', template: '<div [innerText]="foo"></div>'})
class InnerTextComponent {
  foo = 'Some text';
}

@NgModule({
  declarations: [InnerTextComponent],
  bootstrap: [InnerTextComponent],
  imports: [ServerModule, BrowserModule.withServerTransition({appId: 'inner-text'})]
})
class InnerTextModule {
}

function createMyInputComponent(standalone: boolean) {
  @Component({
    standalone,
    selector: 'app',
    template: '<input [name]="name">',
  })
  class MyInputComponent {
    @Input() name = '';
  }
  return MyInputComponent;
}

const MyInputComponent = createMyInputComponent(false);
const MyInputComponentStandalone = createMyInputComponent(true);

@NgModule({
  declarations: [MyInputComponent],
  bootstrap: [MyInputComponent],
  imports: [ServerModule, BrowserModule.withServerTransition({appId: 'name-attributes'})]
})
class NameModule {
}

function createHTMLTypesApp(standalone: boolean) {
  @Component({
    standalone,
    selector: 'app',
    template: '<div [innerHTML]="html"></div>',
  })
  class HTMLTypesApp {
    html = '<b>foo</b> bar';
    constructor(@Inject(DOCUMENT) doc: Document) {}
  }
  return HTMLTypesApp;
}

const HTMLTypesApp = createHTMLTypesApp(false);
const HTMLTypesAppStandalone = createHTMLTypesApp(true);

@NgModule({
  declarations: [HTMLTypesApp],
  imports: [BrowserModule.withServerTransition({appId: 'inner-html'}), ServerModule],
  bootstrap: [HTMLTypesApp]
})
class HTMLTypesModule {
}

const TEST_KEY = makeStateKey<number>('test');
const STRING_KEY = makeStateKey<string>('testString');

@Component({selector: 'app', template: 'Works!'})
class TransferComponent {
  constructor(private transferStore: TransferState) {}
  ngOnInit() {
    this.transferStore.set(TEST_KEY, 10);
  }
}

@Component({selector: 'esc-app', template: 'Works!'})
class EscapedComponent {
  constructor(private transferStore: TransferState) {}
  ngOnInit() {
    this.transferStore.set(STRING_KEY, '</script><script>alert(\'Hello&\' + "World");');
  }
}

@NgModule({
  bootstrap: [TransferComponent],
  declarations: [TransferComponent],
  imports: [
    BrowserModule.withServerTransition({appId: 'transfer'}),
    ServerModule,
    ServerTransferStateModule,
  ]
})
class TransferStoreModule {
}

@NgModule({
  bootstrap: [EscapedComponent],
  declarations: [EscapedComponent],
  imports: [
    BrowserModule.withServerTransition({appId: 'transfer'}),
    ServerModule,
    ServerTransferStateModule,
  ]
})
class EscapedTransferStoreModule {
}

function createMyHiddenComponent(standalone: boolean) {
  @Component({
    standalone,
    selector: 'app',
    template: '<input [hidden]="true"><input [hidden]="false">',
  })
  class MyHiddenComponent {
    @Input() name = '';
  }
  return MyHiddenComponent;
}

const MyHiddenComponent = createMyHiddenComponent(false);
const MyHiddenComponentStandalone = createMyHiddenComponent(true);

@NgModule({
  declarations: [MyHiddenComponent],
  bootstrap: [MyHiddenComponent],
  imports: [ServerModule, BrowserModule.withServerTransition({appId: 'hidden-attributes'})]
})
class HiddenModule {
}

(function() {
if (getDOM().supportsDOMEvents) return;  // NODE only

describe('platform-server integration', () => {
  beforeEach(() => {
    if (getPlatform()) destroyPlatform();
  });

  it('should bootstrap', waitForAsync(() => {
       const platform =
           platformDynamicServer([{provide: INITIAL_CONFIG, useValue: {document: '<app></app>'}}]);

       platform.bootstrapModule(ExampleModule).then((moduleRef) => {
         expect(isPlatformServer(moduleRef.injector.get(PLATFORM_ID))).toBe(true);
         const doc = moduleRef.injector.get(DOCUMENT);

         expect(doc.head).toBe(doc.querySelector('head')!);
         expect(doc.body).toBe(doc.querySelector('body')!);

         expect(doc.documentElement.textContent).toEqual('Works!');

         platform.destroy();
       });
     }));

  it('should allow multiple platform instances', waitForAsync(() => {
       const platform =
           platformDynamicServer([{provide: INITIAL_CONFIG, useValue: {document: '<app></app>'}}]);

       const platform2 =
           platformDynamicServer([{provide: INITIAL_CONFIG, useValue: {document: '<app></app>'}}]);


       platform.bootstrapModule(ExampleModule).then((moduleRef) => {
         const doc = moduleRef.injector.get(DOCUMENT);
         expect(doc.documentElement.textContent).toEqual('Works!');
         platform.destroy();
       });

       platform2.bootstrapModule(ExampleModule2).then((moduleRef) => {
         const doc = moduleRef.injector.get(DOCUMENT);
         expect(doc.documentElement.textContent).toEqual('Works too!');
         platform2.destroy();
       });
     }));

  it('adds title to the document using Title service', waitForAsync(() => {
       const platform = platformDynamicServer([{
         provide: INITIAL_CONFIG,
         useValue: {document: '<html><head><title></title></head><body><app></app></body></html>'}
       }]);
       platform.bootstrapModule(TitleAppModule).then(ref => {
         const state = ref.injector.get(PlatformState);
         const doc = ref.injector.get(DOCUMENT);
         const title = doc.querySelector('title')!;
         expect(title.textContent).toBe('Test App Title');
         expect(state.renderToString()).toContain('<title>Test App Title</title>');
       });
     }));

  it('should get base href from document', waitForAsync(() => {
       const platform = platformDynamicServer([{
         provide: INITIAL_CONFIG,
         useValue: {document: '<html><head><base href="/"></head><body><app></app></body></html>'}
       }]);
       platform.bootstrapModule(ExampleModule).then((moduleRef) => {
         const location = moduleRef.injector.get(PlatformLocation);
         expect(location.getBaseHrefFromDOM()).toEqual('/');
         platform.destroy();
       });
     }));

  it('adds styles with ng-transition attribute', waitForAsync(() => {
       const platform = platformDynamicServer([{
         provide: INITIAL_CONFIG,
         useValue: {document: '<html><head></head><body><app></app></body></html>'}
       }]);
       platform.bootstrapModule(ExampleStylesModule).then(ref => {
         const doc = ref.injector.get(DOCUMENT);
         const head = doc.getElementsByTagName('head')[0];
         const styles: any[] = head.children as any;
         expect(styles.length).toBe(1);
         expect(styles[0].textContent).toContain('color: red');
         expect(styles[0].getAttribute('ng-transition')).toBe('example-styles');
       });
     }));

  it('copies known properties to attributes', waitForAsync(() => {
       const platform =
           platformDynamicServer([{provide: INITIAL_CONFIG, useValue: {document: '<app></app>'}}]);
       platform.bootstrapModule(ImageExampleModule).then(ref => {
         const appRef: ApplicationRef = ref.injector.get(ApplicationRef);
         const app = appRef.components[0].location.nativeElement;
         const img = app.getElementsByTagName('img')[0] as any;
         expect(img.attributes['src'].value).toEqual('link');
       });
     }));

  describe('PlatformLocation', () => {
    it('is injectable', waitForAsync(() => {
         const platform = platformDynamicServer(
             [{provide: INITIAL_CONFIG, useValue: {document: '<app></app>'}}]);
         platform.bootstrapModule(ExampleModule).then(appRef => {
           const location: PlatformLocation = appRef.injector.get(PlatformLocation);
           expect(location.pathname).toBe('/');
           platform.destroy();
         });
       }));
    it('is configurable via INITIAL_CONFIG', () => {
      platformDynamicServer([{
        provide: INITIAL_CONFIG,
        useValue: {document: '<app></app>', url: 'http://test.com/deep/path?query#hash'}
      }])
          .bootstrapModule(ExampleModule)
          .then(appRef => {
            const location: PlatformLocation = appRef.injector.get(PlatformLocation);
            expect(location.pathname).toBe('/deep/path');
            expect(location.search).toBe('?query');
            expect(location.hash).toBe('#hash');
          });
    });
    it('parses component pieces of a URL', () => {
      platformDynamicServer([{
        provide: INITIAL_CONFIG,
        useValue: {document: '<app></app>', url: 'http://test.com:80/deep/path?query#hash'}
      }])
          .bootstrapModule(ExampleModule)
          .then(appRef => {
            const location: PlatformLocation = appRef.injector.get(PlatformLocation);
            expect(location.hostname).toBe('test.com');
            expect(location.protocol).toBe('http:');
            expect(location.port).toBe('80');
            expect(location.pathname).toBe('/deep/path');
            expect(location.search).toBe('?query');
            expect(location.hash).toBe('#hash');
          });
    });
    it('handles empty search and hash portions of the url', () => {
      platformDynamicServer([{
        provide: INITIAL_CONFIG,
        useValue: {document: '<app></app>', url: 'http://test.com/deep/path'}
      }])
          .bootstrapModule(ExampleModule)
          .then(appRef => {
            const location: PlatformLocation = appRef.injector.get(PlatformLocation);
            expect(location.pathname).toBe('/deep/path');
            expect(location.search).toBe('');
            expect(location.hash).toBe('');
          });
    });
    it('pushState causes the URL to update', waitForAsync(() => {
         const platform = platformDynamicServer(
             [{provide: INITIAL_CONFIG, useValue: {document: '<app></app>'}}]);
         platform.bootstrapModule(ExampleModule).then(appRef => {
           const location: PlatformLocation = appRef.injector.get(PlatformLocation);
           location.pushState(null, 'Test', '/foo#bar');
           expect(location.pathname).toBe('/foo');
           expect(location.hash).toBe('#bar');
           platform.destroy();
         });
       }));
    it('allows subscription to the hash state', done => {
      const platform =
          platformDynamicServer([{provide: INITIAL_CONFIG, useValue: {document: '<app></app>'}}]);
      platform.bootstrapModule(ExampleModule).then(appRef => {
        const location: PlatformLocation = appRef.injector.get(PlatformLocation);
        expect(location.pathname).toBe('/');
        location.onHashChange((e: any) => {
          expect(e.type).toBe('hashchange');
          expect(e.oldUrl).toBe('/');
          expect(e.newUrl).toBe('/foo#bar');
          platform.destroy();
          done();
        });
        location.pushState(null, 'Test', '/foo#bar');
      });
    });
  });

  describe('render', () => {
    let doc: string;
    let called: boolean;
    let expectedOutput =
        '<html><head></head><body><app ng-version="0.0.0-PLACEHOLDER">Works!<h1 textcontent="fine">fine</h1></app></body></html>';

    beforeEach(() => {
      // PlatformConfig takes in a parsed document so that it can be cached across requests.
      doc = '<html><head></head><body><app></app></body></html>';
      called = false;
    });
    afterEach(() => {
      expect(called).toBe(true);
    });

    it('using long form should work', waitForAsync(() => {
         const platform =
             platformDynamicServer([{provide: INITIAL_CONFIG, useValue: {document: doc}}]);

         platform.bootstrapModule(AsyncServerModule)
             .then((moduleRef) => {
               const applicationRef: ApplicationRef = moduleRef.injector.get(ApplicationRef);
               return applicationRef.isStable.pipe(first((isStable: boolean) => isStable))
                   .toPromise();
             })
             .then((b) => {
               expect(platform.injector.get(PlatformState).renderToString()).toBe(expectedOutput);
               platform.destroy();
               called = true;
             });
       }));

    it('using renderModuleFactory should work',
       waitForAsync(inject([PlatformRef], (defaultPlatform: PlatformRef) => {
         const compilerFactory: CompilerFactory =
             defaultPlatform.injector.get(CompilerFactory, null)!;
         const moduleFactory =
             compilerFactory.createCompiler().compileModuleSync(AsyncServerModule);
         renderModuleFactory(moduleFactory, {document: doc}).then(output => {
           expect(output).toBe(expectedOutput);
           called = true;
         });
       })));

    // Run the set of tests with regular and standalone components.
    [true, false].forEach((isStandalone: boolean) => {
      it('using renderModule should work', waitForAsync(() => {
           const options = {document: doc};
           const bootstrap = isStandalone ?
               renderApplication(MyAsyncServerAppStandalone, 'simple-cmp', options) :
               renderModule(AsyncServerModule, options);
           bootstrap.then(output => {
             expect(output).toBe(expectedOutput);
             called = true;
           });
         }));

      it('works with SVG elements', waitForAsync(() => {
           const options = {document: doc};
           const bootstrap = isStandalone ?
               renderApplication(SVGComponentStandalone, 'simple-cmp', options) :
               renderModule(SVGServerModule, options);
           bootstrap.then(output => {
             expect(output).toBe(
                 '<html><head></head><body><app ng-version="0.0.0-PLACEHOLDER">' +
                 '<svg><use xlink:href="#clear"></use></svg></app></body></html>');
             called = true;
           });
         }));

      it('works with animation', waitForAsync(() => {
           const options = {document: doc};
           const bootstrap = isStandalone ?
               renderApplication(MyAnimationAppStandalone, 'simple-cmp', options) :
               renderModule(AnimationServerModule, options);
           bootstrap.then(output => {
             expect(output).toContain('Works!');
             expect(output).toContain('ng-trigger-myAnimation');
             expect(output).toContain('opacity:1;');
             expect(output).toContain('transform:translate3d(0 , 0 , 0);');
             expect(output).toContain('font-weight:bold;');
             called = true;
           });
         }));

      it('should handle ViewEncapsulation.ShadowDom', waitForAsync(() => {
           const options = {document: doc};
           const bootstrap = isStandalone ?
               renderApplication(ShadowDomEncapsulationAppStandalone, 'simple-cmp', options) :
               renderModule(ShadowDomExampleModule, options);
           bootstrap.then(output => {
             expect(output).not.toBe('');
             expect(output).toContain('color: red');
             called = true;
           });
         }));

      it('sets a prefix for the _nghost and _ngcontent attributes', waitForAsync(() => {
           const options = {document: doc};
           const bootstrap = isStandalone ?
               renderApplication(MyStylesAppStandalone, 'example-styles', options) :
               renderModule(ExampleStylesModule, options);
           bootstrap.then(output => {
             expect(output).toMatch(
                 /<html><head><style ng-transition="example-styles">div\[_ngcontent-sc\d+\] {color: blue; } \[_nghost-sc\d+\] { color: red; }<\/style><\/head><body><app _nghost-sc\d+="" ng-version="0.0.0-PLACEHOLDER"><div _ngcontent-sc\d+="">Works!<\/div><\/app><\/body><\/html>/);
             called = true;
           });
         }));

      it('should handle false values on attributes', waitForAsync(() => {
           const options = {document: doc};
           const bootstrap = isStandalone ?
               renderApplication(MyHostComponentStandalone, 'example-app', options) :
               renderModule(FalseAttributesModule, options);
           bootstrap.then(output => {
             expect(output).toBe(
                 '<html><head></head><body><app ng-version="0.0.0-PLACEHOLDER">' +
                 '<my-child ng-reflect-attr="false">Works!</my-child></app></body></html>');
             called = true;
           });
         }));

      it('should handle element property "name"', waitForAsync(() => {
           const options = {document: doc};
           const bootstrap = isStandalone ?
               renderApplication(MyInputComponentStandalone, 'example-app', options) :
               renderModule(NameModule, options);
           bootstrap.then(output => {
             expect(output).toBe(
                 '<html><head></head><body><app ng-version="0.0.0-PLACEHOLDER">' +
                 '<input name=""></app></body></html>');
             called = true;
           });
         }));

      it('should work with sanitizer to handle "innerHTML"', waitForAsync(() => {
           // Clear out any global states. These should be set when platform-server
           // is initialized.
           (global as any).Node = undefined;
           (global as any).Document = undefined;
           const options = {document: doc};
           const bootstrap = isStandalone ?
               renderApplication(HTMLTypesAppStandalone, 'example-app', options) :
               renderModule(HTMLTypesModule, options);
           bootstrap.then(output => {
             expect(output).toBe(
                 '<html><head></head><body><app ng-version="0.0.0-PLACEHOLDER">' +
                 '<div><b>foo</b> bar</div></app></body></html>');
             called = true;
           });
         }));

      it('should handle element property "hidden"', waitForAsync(() => {
           const options = {document: doc};
           const bootstrap = isStandalone ?
               renderApplication(MyHiddenComponentStandalone, 'example-app', options) :
               renderModule(HiddenModule, options);
           bootstrap.then(output => {
             expect(output).toBe(
                 '<html><head></head><body><app ng-version="0.0.0-PLACEHOLDER">' +
                 '<input hidden=""><input></app></body></html>');
             called = true;
           });
         }));

      it('should call render hook', waitForAsync(() => {
           const options = {document: doc};
           const bootstrap = isStandalone ? renderApplication(
                                                MyServerAppStandalone, 'example-app',
                                                {...options, providers: [...RenderHookProviders]}) :
                                            renderModule(RenderHookModule, options);
           bootstrap.then(output => {
             // title should be added by the render hook.
             expect(output).toBe(
                 '<html><head><title>RenderHook</title></head><body>' +
                 '<app ng-version="0.0.0-PLACEHOLDER">Works!</app></body></html>');
             called = true;
           });
         }));

      it('should call multiple render hooks', waitForAsync(() => {
           const consoleSpy = spyOn(console, 'warn');
           const options = {document: doc};
           const bootstrap = isStandalone ?
               renderApplication(
                   MyServerAppStandalone, 'example-app',
                   {...options, providers: [...MultiRenderHookProviders]}) :
               renderModule(MultiRenderHookModule, options);
           bootstrap.then(output => {
             // title should be added by the render hook.
             expect(output).toBe(
                 '<html><head><title>RenderHook</title><meta name="description"></head>' +
                 '<body><app ng-version="0.0.0-PLACEHOLDER">Works!</app></body></html>');
             expect(consoleSpy).toHaveBeenCalled();
             called = true;
           });
         }));

      it('should call async render hooks', waitForAsync(() => {
           const options = {document: doc};
           const bootstrap = isStandalone ?
               renderApplication(
                   MyServerAppStandalone, 'example-app',
                   {...options, providers: [...AsyncRenderHookProviders]}) :
               renderModule(AsyncRenderHookModule, options);
           bootstrap.then(output => {
             // title should be added by the render hook.
             expect(output).toBe(
                 '<html><head><title>AsyncRenderHook</title></head><body>' +
                 '<app ng-version="0.0.0-PLACEHOLDER">Works!</app></body></html>');
             called = true;
           });
         }));

      it('should call multiple async and sync render hooks', waitForAsync(() => {
           const consoleSpy = spyOn(console, 'warn');
           const options = {document: doc};
           const bootstrap = isStandalone ?
               renderApplication(
                   MyServerAppStandalone, 'example-app',
                   {...options, providers: [...AsyncMultiRenderHookProviders]}) :
               renderModule(AsyncMultiRenderHookModule, options);
           bootstrap.then(output => {
             // title should be added by the render hook.
             expect(output).toBe(
                 '<html><head><meta name="description"><title>AsyncRenderHook</title></head>' +
                 '<body><app ng-version="0.0.0-PLACEHOLDER">Works!</app></body></html>');
             expect(consoleSpy).toHaveBeenCalled();
             called = true;
           });
         }));
    });
  });

  describe('HttpClient', () => {
    it('can inject HttpClient', waitForAsync(() => {
         const platform = platformDynamicServer(
             [{provide: INITIAL_CONFIG, useValue: {document: '<app></app>'}}]);
         platform.bootstrapModule(HttpClientExampleModule).then(ref => {
           expect(ref.injector.get(HttpClient) instanceof HttpClient).toBeTruthy();
         });
       }));

    it('can make HttpClient requests', waitForAsync(() => {
         const platform = platformDynamicServer(
             [{provide: INITIAL_CONFIG, useValue: {document: '<app></app>'}}]);
         platform.bootstrapModule(HttpClientExampleModule).then(ref => {
           const mock = ref.injector.get(HttpTestingController) as HttpTestingController;
           const http = ref.injector.get(HttpClient);
           ref.injector.get<NgZone>(NgZone).run(() => {
             http.get<string>('http://localhost/testing').subscribe((body: string) => {
               NgZone.assertInAngularZone();
               expect(body).toEqual('success!');
             });
             mock.expectOne('http://localhost/testing').flush('success!');
           });
         });
       }));

    describe('relative requests', () => {
      it('will throw if "useAbsoluteUrl" is true but "baseUrl" is not provided', async () => {
        const platform = platformDynamicServer([{
          provide: INITIAL_CONFIG,
          useValue: {
            document: '<app></app>',
            url: 'http://localhost',
            useAbsoluteUrl: true,
          },
        }]);
        const appRef = await platform.bootstrapModule(HttpClientExampleModule);
        expect(() => appRef.injector.get(PlatformLocation))
            .toThrowError(/"PlatformConfig\.baseUrl" must be set if "useAbsoluteUrl" is true/);
      });

      it('will resolve absolute url using "baseUrl"', async () => {
        const platform = platformDynamicServer([{
          provide: INITIAL_CONFIG,
          useValue: {
            document: '<app></app>',
            url: 'http://localhost',
            useAbsoluteUrl: true,
            baseUrl: 'https://angular.io:8080',
          },
        }]);
        const appRef = await platform.bootstrapModule(HttpClientExampleModule);
        const location = appRef.injector.get(PlatformLocation);
        expect(location.protocol).toBe('https:');
        expect(location.hostname).toBe('angular.io');
        expect(location.port).toBe('8080');
      });

      it('"baseUrl" has no effect if "useAbsoluteUrl" is not enabled', async () => {
        const platform = platformDynamicServer([{
          provide: INITIAL_CONFIG,
          useValue: {
            document: '<app></app>',
            url: 'http://localhost',
            baseUrl: 'https://angular.io:8080',
          },
        }]);
        const appRef = await platform.bootstrapModule(HttpClientExampleModule);
        const location = appRef.injector.get(PlatformLocation);
        expect(location.protocol).toBe('http:');
        expect(location.hostname).toBe('localhost');
        expect(location.port).toBe('');
      });

      it('correctly maps to absolute URL request with base config', async () => {
        const platform = platformDynamicServer([{
          provide: INITIAL_CONFIG,
          useValue: {
            document: '<app></app>',
            url: 'http://localhost',
            baseUrl: 'http://localhost',
            useAbsoluteUrl: true,
          }
        }]);
        const ref = await platform.bootstrapModule(HttpClientExampleModule);
        const mock = ref.injector.get(HttpTestingController) as HttpTestingController;
        const http = ref.injector.get(HttpClient);
        ref.injector.get(NgZone).run(() => {
          http.get<string>('/testing').subscribe((body: string) => {
            NgZone.assertInAngularZone();
            expect(body).toEqual('success!');
          });
          mock.expectOne('http://localhost/testing').flush('success!');
        });
      });

      it('uses default URL behavior when not enabled', async () => {
        const platform = platformDynamicServer([{
          provide: INITIAL_CONFIG,
          useValue: {document: '<app></app>', url: 'http://localhost', useAbsoluteUrl: false}
        }]);
        const ref = await platform.bootstrapModule(HttpClientExampleModule);
        const mock = ref.injector.get(HttpTestingController) as HttpTestingController;
        const http = ref.injector.get(HttpClient);
        ref.injector.get(NgZone).run(() => {
          http.get<string>('/testing').subscribe(() => {}, (body: string) => {
            NgZone.assertInAngularZone();
            expect(body).toEqual('error');
          });
          mock.expectOne('/testing').flush('error');
        });
      });

      it('correctly maps to absolute URL request with port', async () => {
        const platform = platformDynamicServer([{
          provide: INITIAL_CONFIG,
          useValue: {
            document: '<app></app>',
            url: 'http://localhost:5000',
            baseUrl: 'http://localhost',
            useAbsoluteUrl: true,
          }
        }]);
        const ref = await platform.bootstrapModule(HttpClientExampleModule);
        const mock = ref.injector.get(HttpTestingController) as HttpTestingController;
        const http = ref.injector.get(HttpClient);
        ref.injector.get(NgZone).run(() => {
          http.get<string>('/testing').subscribe((body: string) => {
            NgZone.assertInAngularZone();
            expect(body).toEqual('success!');
          });
          mock.expectOne('http://localhost:5000/testing').flush('success!');
        });
      });

      it('correctly maps to absolute URL request with two slashes', async () => {
        const platform = platformDynamicServer([{
          provide: INITIAL_CONFIG,
          useValue: {
            document: '<app></app>',
            url: 'http://localhost/',
            baseUrl: 'http://localhost',
            useAbsoluteUrl: true,
          }
        }]);
        const ref = await platform.bootstrapModule(HttpClientExampleModule);
        const mock = ref.injector.get(HttpTestingController) as HttpTestingController;
        const http = ref.injector.get(HttpClient);
        ref.injector.get(NgZone).run(() => {
          http.get<string>('/testing').subscribe((body: string) => {
            NgZone.assertInAngularZone();
            expect(body).toEqual('success!');
          });
          mock.expectOne('http://localhost/testing').flush('success!');
        });
      });

      it('correctly maps to absolute URL request with no slashes', async () => {
        const platform = platformDynamicServer([{
          provide: INITIAL_CONFIG,
          useValue: {
            document: '<app></app>',
            url: 'http://localhost',
            baseUrl: 'http://localhost',
            useAbsoluteUrl: true,
          }
        }]);
        const ref = await platform.bootstrapModule(HttpClientExampleModule);
        const mock = ref.injector.get(HttpTestingController) as HttpTestingController;
        const http = ref.injector.get(HttpClient);
        ref.injector.get(NgZone).run(() => {
          http.get<string>('testing').subscribe((body: string) => {
            NgZone.assertInAngularZone();
            expect(body).toEqual('success!');
          });
          mock.expectOne('http://localhost/testing').flush('success!');
        });
      });

      it('correctly maps to absolute URL request with longer url and no slashes', async () => {
        const platform = platformDynamicServer([{
          provide: INITIAL_CONFIG,
          useValue: {
            document: '<app></app>',
            url: 'http://localhost/path/page',
            baseUrl: 'http://localhost',
            useAbsoluteUrl: true,
          }
        }]);
        const ref = await platform.bootstrapModule(HttpClientExampleModule);
        const mock = ref.injector.get(HttpTestingController) as HttpTestingController;
        const http = ref.injector.get(HttpClient);
        ref.injector.get(NgZone).run(() => {
          http.get<string>('testing').subscribe((body: string) => {
            NgZone.assertInAngularZone();
            expect(body).toEqual('success!');
          });
          mock.expectOne('http://localhost/path/testing').flush('success!');
        });
      });

      it('correctly maps to absolute URL request with longer url and slashes', async () => {
        const platform = platformDynamicServer([{
          provide: INITIAL_CONFIG,
          useValue: {
            document: '<app></app>',
            url: 'http://localhost/path/page',
            baseUrl: 'http://localhost',
            useAbsoluteUrl: true,
          }
        }]);
        const ref = await platform.bootstrapModule(HttpClientExampleModule);
        const mock = ref.injector.get(HttpTestingController) as HttpTestingController;
        const http = ref.injector.get(HttpClient);
        ref.injector.get(NgZone).run(() => {
          http.get<string>('/testing').subscribe((body: string) => {
            NgZone.assertInAngularZone();
            expect(body).toEqual('success!');
          });
          mock.expectOne('http://localhost/testing').flush('success!');
        });
      });

      it('correctly maps to absolute URL request with longer url, slashes, and base href',
         async () => {
           const platform = platformDynamicServer([{
             provide: INITIAL_CONFIG,
             useValue: {
               document: '<base href="http://other"><app></app>',
               url: 'http://localhost/path/page',
               baseUrl: 'http://localhost',
               useAbsoluteUrl: true,
             }
           }]);
           const ref = await platform.bootstrapModule(HttpClientExampleModule);
           const mock = ref.injector.get(HttpTestingController) as HttpTestingController;
           const http = ref.injector.get(HttpClient);
           ref.injector.get(NgZone).run(() => {
             http.get<string>('/testing').subscribe((body: string) => {
               NgZone.assertInAngularZone();
               expect(body).toEqual('success!');
             });
             mock.expectOne('http://other/testing').flush('success!');
           });
         });
    });

    it('requests are macrotasks', waitForAsync(() => {
         const platform = platformDynamicServer(
             [{provide: INITIAL_CONFIG, useValue: {document: '<app></app>'}}]);
         platform.bootstrapModule(HttpClientExampleModule).then(ref => {
           const mock = ref.injector.get(HttpTestingController) as HttpTestingController;
           const http = ref.injector.get(HttpClient);
           ref.injector.get(NgZone).run(() => {
             http.get<string>('http://localhost/testing').subscribe((body: string) => {
               expect(body).toEqual('success!');
             });
             expect(ref.injector.get<NgZone>(NgZone).hasPendingMacrotasks).toBeTruthy();
             mock.expectOne('http://localhost/testing').flush('success!');
             expect(ref.injector.get<NgZone>(NgZone).hasPendingMacrotasks).toBeFalsy();
           });
         });
       }));

    it('can use HttpInterceptor that injects HttpClient', () => {
      const platform =
          platformDynamicServer([{provide: INITIAL_CONFIG, useValue: {document: '<app></app>'}}]);
      platform.bootstrapModule(HttpInterceptorExampleModule).then(ref => {
        const mock = ref.injector.get(HttpTestingController) as HttpTestingController;
        const http = ref.injector.get(HttpClient);
        ref.injector.get(NgZone).run(() => {
          http.get<string>('http://localhost/testing').subscribe((body: string) => {
            NgZone.assertInAngularZone();
            expect(body).toEqual('success!');
          });
          mock.expectOne('http://localhost/testing').flush('success!');
        });
      });
    });
  });

  describe('ServerTransferStoreModule', () => {
    let called = false;
    const defaultExpectedOutput =
        '<html><head></head><body><app ng-version="0.0.0-PLACEHOLDER">Works!</app><script id="transfer-state" type="application/json">{&q;test&q;:10}</script></body></html>';

    beforeEach(() => {
      called = false;
    });
    afterEach(() => {
      expect(called).toBe(true);
    });

    it('adds transfer script tag when using renderModule', waitForAsync(() => {
         renderModule(TransferStoreModule, {document: '<app></app>'}).then(output => {
           expect(output).toBe(defaultExpectedOutput);
           called = true;
         });
       }));

    it('adds transfer script tag when using renderModuleFactory',
       waitForAsync(inject([PlatformRef], (defaultPlatform: PlatformRef) => {
         const compilerFactory: CompilerFactory =
             defaultPlatform.injector.get(CompilerFactory, null)!;
         const moduleFactory =
             compilerFactory.createCompiler().compileModuleSync(TransferStoreModule);
         renderModuleFactory(moduleFactory, {document: '<app></app>'}).then(output => {
           expect(output).toBe(defaultExpectedOutput);
           called = true;
         });
       })));

    it('cannot break out of <script> tag in serialized output', waitForAsync(() => {
         renderModule(EscapedTransferStoreModule, {
           document: '<esc-app></esc-app>'
         }).then(output => {
           expect(output).toBe(
               '<html><head></head><body><esc-app ng-version="0.0.0-PLACEHOLDER">Works!</esc-app>' +
               '<script id="transfer-state" type="application/json">' +
               '{&q;testString&q;:&q;&l;/script&g;&l;script&g;' +
               'alert(&s;Hello&a;&s; + \\&q;World\\&q;);&q;}</script></body></html>');
           called = true;
         });
       }));
  });
});
})();
