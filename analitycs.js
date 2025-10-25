(async function() {
    console.log('[Analytics] Iniciando módulo analitycs.js...');

    // ==============================
    // ⚙️ Função para inicializar socket.io
    // ==============================
    async function initSocket() {
        try {
            // Aguarda o socket.io ser carregado dinamicamente
            if (typeof io === 'undefined') {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = '/socket.io/socket.io.js'; // servidor express serve automaticamente este endpoint
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            // Conecta ao servidor
            const socket = io({
                transports: ['websocket', 'polling']
            });
            window.socket = socket;

            socket.on('connect', () => {
                console.log(`[Socket.io] Conectado ao servidor (ID: ${socket.id})`);
            });

            socket.on('disconnect', () => {
                console.warn('[Socket.io] Desconectado do servidor.');
            });

            socket.on('connect_error', (err) => {
                console.error('[Socket.io] Erro de conexão:', err);
            });

            // Evento opcional para atualizar status de usuários conectados
            socket.on('users_online', (count) => {
                console.log(`[Socket.io] Usuários conectados: ${count}`);
            });

            return socket;
        } catch (err) {
            console.error('[Socket.io] Falha ao inicializar:', err);
        }
    }

    function setBackRedirect(url) {
        let urlBackRedirect = url;
        urlBackRedirect = urlBackRedirect =
            urlBackRedirect.trim() +
            (urlBackRedirect.indexOf('?') > 0 ? '&' : '?') +
            document.location.search.replace('?', '').toString();

        history.pushState({}, '', location.href);
        history.pushState({}, '', location.href);
        history.pushState({}, '', location.href);

        window.addEventListener('popstate', () => {
            console.log('onpopstate', urlBackRedirect);
            setTimeout(() => {
                location.href = urlBackRedirect;
            }, 1);
        });
    }
    async function initAnalytics() {
        try {
            // Busca as configurações da API
            const resposta = await fetch('/api/analitycs');
            const dados = await resposta.json();

            console.log(dados);
            document.analitycs = dados;

            // --- GOOGLE (Analytics ou Ads) ---
            if (dados.google && dados.google.config) {
                const googleId = dados.google.config.replace(/['"]/g, '');

                const scriptGoogle = document.createElement('script');
                scriptGoogle.src = `https://www.googletagmanager.com/gtag/js?id=${googleId}`;
                scriptGoogle.async = true;
                document.head.appendChild(scriptGoogle);

                // Inicializa o gtag
                window.dataLayer = window.dataLayer || [];

                function gtag() {
                    dataLayer.push(arguments);
                }
                window.gtag = gtag;

                gtag('js', new Date());
                gtag('config', googleId);

                console.log(`[Analytics] Google Tag carregado: ${googleId}`);
            }

            // --- META (FACEBOOK) PIXEL ---
            if (dados.meta && dados.meta.config) {
                const metaId = dados.meta.config.replace(/['"]/g, '');

                !(function(f, b, e, v, n, t, s) {
                    if (f.fbq) return;
                    n = f.fbq = function() {
                        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
                    };
                    if (!f._fbq) f._fbq = n;
                    n.push = n;
                    n.loaded = !0;
                    n.version = '2.0';
                    n.queue = [];
                    t = b.createElement(e);
                    t.async = !0;
                    t.src = v;
                    s = b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t, s);
                })(window, document, 'script', 'https://connect.facebook.net/pt_BR/fbevents.js');

                fbq('init', metaId);
                fbq('track', 'PageView');

                console.log(`[Analytics] Meta Pixel carregado: ${metaId}`);
            }
            window.conversao = function(tipo, valor = 0, moeda = 'BRL', detalhes = {}) {
                console.log(`[Conversão] Evento: ${tipo}`, {
                    valor,
                    moeda,
                    detalhes
                });

                // META (Facebook)
                if (window.fbq) {
                    switch (tipo) {
                        case 'addToCart':
                            fbq('track', 'AddToCart', {
                                value: valor,
                                currency: moeda,
                                ...detalhes
                            });
                            break;
                        case 'initiateCheckout':
                            fbq('track', 'InitiateCheckout', {
                                value: valor,
                                currency: moeda,
                                ...detalhes
                            });
                            break;
                        case 'purchase':
                            fbq('track', 'Purchase', {
                                value: valor,
                                currency: moeda,
                                ...detalhes
                            });
                            break;
                        default:
                            fbq('trackCustom', tipo, detalhes);
                    }
                }

                // GOOGLE (Analytics / Ads)
                if (window.gtag) {
                    switch (tipo) {
                        case 'addToCart':
                            gtag('event', 'add_to_cart', {
                                value: valor,
                                currency: moeda,
                                ...detalhes
                            });
                            break;
                        case 'initiateCheckout':
                            gtag('event', 'begin_checkout', {
                                value: valor,
                                currency: moeda,
                                ...detalhes
                            });
                            break;
                        case 'purchase':
                            if (!detalhes.transaction_id) {
                                console.warn('[Conversão] ⚠️ "purchase" precisa de transaction_id!');
                            }

                            const tid = detalhes.transaction_id || `temp-${Date.now()}`;

                            gtag('event', 'purchase', {
                                transaction_id: tid,
                                value: valor,
                                currency: moeda,
                                ...detalhes
                            });

                            if (document.analitycs ? .google ? .conversion) {
                                gtag('event', 'conversion', {
                                    send_to: document.analitycs.google.conversion,
                                    value: valor,
                                    currency: moeda,
                                    transaction_id: tid
                                });

                            }
                            break;
                        default:
                            gtag('event', tipo, detalhes);
                    }
                }
            };


            console.log('[Analytics] Função global window.conversao() pronta.');

            if (dados.backRedirect) {
                const link = dados.backRedirect;
                setBackRedirect(link);
                console.log('[Analytics] Back Redirect definido pra => ' + link);
            }




        } catch (erro) {
            console.error('[Analytics] Falha ao inicializar:', erro);
        }
    }

    // Inicializa socket.io e analytics paralelamente
    await Promise.all([initSocket(), initAnalytics()]);
    console.log('[Analytics] Sistema de tracking e socket.io inicializados com sucesso.');

})();