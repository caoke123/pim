-- 2026-06-01: 分销管理三张表
CREATE TABLE IF NOT EXISTS customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    contact_person  VARCHAR(100),
    phone           VARCHAR(50),
    wechat          VARCHAR(100),
    notes           TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    operator        VARCHAR(50) DEFAULT 'XP',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS distributions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    catalog_id      UUID NOT NULL REFERENCES catalogs(id) ON DELETE RESTRICT,
    agreement       TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    public_url      TEXT,
    operator        VARCHAR(50) DEFAULT 'XP',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS distribution_sku_prices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribution_id     UUID NOT NULL REFERENCES distributions(id) ON DELETE CASCADE,
    sku_id              UUID NOT NULL REFERENCES product_skus(id) ON DELETE CASCADE,
    spu_code            VARCHAR(100) NOT NULL,
    customer_price      NUMERIC(10,2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(distribution_id, sku_id)
);

CREATE INDEX IF NOT EXISTS idx_distributions_customer
    ON distributions(customer_id);
CREATE INDEX IF NOT EXISTS idx_distributions_catalog
    ON distributions(catalog_id);
CREATE INDEX IF NOT EXISTS idx_distribution_prices_distribution
    ON distribution_sku_prices(distribution_id);
CREATE INDEX IF NOT EXISTS idx_distribution_prices_sku
    ON distribution_sku_prices(sku_id);

GRANT SELECT, INSERT, UPDATE, DELETE
    ON customers, distributions, distribution_sku_prices
    TO pim_user;
