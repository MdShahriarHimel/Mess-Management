package com.messmanagement.app;

import java.net.URI;
import java.net.URISyntaxException;

final class NavigationPolicy {
    private final String host;

    NavigationPolicy(String websiteUrl) {
        host = URI.create(websiteUrl).getHost();
    }

    boolean isWebsite(String url) {
        URI uri = parse(url);
        return uri != null && "https".equalsIgnoreCase(uri.getScheme())
                && host.equalsIgnoreCase(uri.getHost())
                && (uri.getPort() == -1 || uri.getPort() == 443)
                && uri.getUserInfo() == null;
    }

    static boolean canOpenExternally(String url) {
        URI uri = parse(url);
        if (uri == null) return false;
        String scheme = uri.getScheme();
        return ("https".equalsIgnoreCase(scheme) && uri.getHost() != null
                && uri.getUserInfo() == null)
                || "mailto".equalsIgnoreCase(scheme)
                || "tel".equalsIgnoreCase(scheme);
    }

    private static URI parse(String url) {
        if (url == null) return null;
        try {
            return new URI(url);
        } catch (URISyntaxException e) {
            return null;
        }
    }
}
