// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register() {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: any }) {
    try {
      // Set Public API role permissions
      const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'public' },
      });

      if (publicRole) {
        const roleService = strapi.service('plugin::users-permissions.role');
        await roleService.updateRole(publicRole.id, {
          permissions: {
            'api::product': { controllers: { product: { find: true, findOne: true } } },
            'api::category': { controllers: { category: { find: true, findOne: true } } },
            'api::publisher': { controllers: { publisher: { find: true, findOne: true } } },
            'api::source-url': { controllers: { 'source-url': { find: true, findOne: true } } },
            'api::archive-snapshot': { controllers: { 'archive-snapshot': { find: true, findOne: true } } },
          },
        });
        strapi.log.info('Bootstrap: Public role permissions ensured.');
      }

      // Create custom admin roles
      const adminRoleService = strapi.admin.services.role;
      
      // Content Manager Role
      const contentManagerExists = await strapi.db.query('admin::role').findOne({
        where: { name: 'Content Manager' },
      });
      
      if (!contentManagerExists) {
        await adminRoleService.create({
          name: 'Content Manager',
          code: 'content-manager',
          description: 'Manage products, publishers, categories, and content',
        });
        strapi.log.info('Bootstrap: Content Manager role created.');
      }

      // Ingestion Operator Role
      const ingestionOperatorExists = await strapi.db.query('admin::role').findOne({
        where: { name: 'Ingestion Operator' },
      });
      
      if (!ingestionOperatorExists) {
        await adminRoleService.create({
          name: 'Ingestion Operator',
          code: 'ingestion-operator',
          description: 'Run ingestion jobs, view logs, manage archive snapshots',
        });
        strapi.log.info('Bootstrap: Ingestion Operator role created.');
      }

      // Viewer Role
      const viewerExists = await strapi.db.query('admin::role').findOne({
        where: { name: 'Viewer' },
      });
      
      if (!viewerExists) {
        await adminRoleService.create({
          name: 'Viewer',
          code: 'viewer',
          description: 'Read-only access to content and logs',
        });
        strapi.log.info('Bootstrap: Viewer role created.');
      }

    } catch (error) {
      strapi.log.error('Bootstrap error:', error);
    }
  },
};
