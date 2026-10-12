#!/usr/bin/perl
# Fallback local server for Chess Analysis (used by the macOS launcher when
# python3 is not installed). Uses only Perl core modules, which ship with macOS.
# Sends the cross-origin isolation headers Stockfish 19's threaded WebAssembly needs.
#   perl serve.pl [--port 8719] [--no-browser]
use strict;
use warnings;
use IO::Socket::INET;
use File::Basename qw(dirname);
use File::Spec;
use Cwd qw(abs_path);

my $root = abs_path(dirname(__FILE__));
my $port = 8719;
my $open_browser = 1;
for (my $i = 0; $i < @ARGV; $i++) {
    if ($ARGV[$i] eq '--port') { $port = $ARGV[++$i]; }
    elsif ($ARGV[$i] eq '--no-browser') { $open_browser = 0; }
}
my %types = (
    html => 'text/html; charset=utf-8', js => 'text/javascript', mjs => 'text/javascript',
    css => 'text/css', json => 'application/json', wasm => 'application/wasm',
    svg => 'image/svg+xml', png => 'image/png', txt => 'text/plain; charset=utf-8',
    tsv => 'text/tab-separated-values', md => 'text/plain; charset=utf-8', pgn => 'application/x-chess-pgn',
);
$SIG{CHLD} = 'IGNORE';

my $server;
for my $p ($port .. $port + 20) {
    $server = IO::Socket::INET->new(LocalAddr => '127.0.0.1', LocalPort => $p, Listen => 32, ReuseAddr => 1, Proto => 'tcp');
    if ($server) { $port = $p; last; }
}
die "Could not open a local port\n" unless $server;
my $url = "http://localhost:$port/index.html";
$| = 1;
print "Chess Analysis is running at $url\n";
print "Keep this window open while using the app. Press Ctrl+C to stop.\n";
if ($open_browser) {
    my $opener = $^O eq 'darwin' ? 'open' : 'xdg-open';
    system("$opener '$url' >/dev/null 2>&1 &");
}

while (my $client = $server->accept) {
    my $pid = fork();
    if (!defined $pid) { handle($client); next; }
    if ($pid == 0) { $server->close; handle($client); exit 0; }
    $client->close;
}

sub respond {
    my ($c, $status, $type, $len) = @_;
    print $c "HTTP/1.0 $status\r\nContent-Type: $type\r\nContent-Length: $len\r\n"
      . "Cross-Origin-Opener-Policy: same-origin\r\nCross-Origin-Embedder-Policy: require-corp\r\n"
      . "Cross-Origin-Resource-Policy: same-origin\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n";
}

sub handle {
    my ($c) = @_;
    binmode $c;
    my $req = <$c>;
    return close $c unless defined $req;
    while (my $h = <$c>) { last if $h =~ /^\r?\n$/; }
    my ($method, $target) = $req =~ m{^(GET|HEAD) (\S+) HTTP/};
    unless ($method) { respond($c, '405 Method Not Allowed', 'text/plain', 0); return close $c; }
    $target =~ s/[?#].*//;
    $target =~ s/%([0-9A-Fa-f]{2})/chr(hex($1))/ge;
    $target = '/index.html' if $target eq '/';
    if ($target =~ m{(^|/)\.\.(/|$)}) { respond($c, '403 Forbidden', 'text/plain', 0); return close $c; }
    my $file = File::Spec->catfile($root, split m{/}, $target);
    if (-d $file) { $file = File::Spec->catfile($file, 'index.html'); }
    unless (-f $file && open(my $fh, '<:raw', $file)) {
        my $msg = "Not found: $target\n";
        respond($c, '404 Not Found', 'text/plain', length $msg);
        print $c $msg if $method eq 'GET';
        return close $c;
    }
    my ($ext) = $file =~ /\.([^.\/]+)$/;
    my $type = $types{lc($ext // '')} // 'application/octet-stream';
    open(my $fh, '<:raw', $file);
    respond($c, '200 OK', $type, -s $file);
    if ($method eq 'GET') {
        my $buf;
        while (read($fh, $buf, 65536)) { print $c $buf; }
    }
    close $fh;
    close $c;
}
