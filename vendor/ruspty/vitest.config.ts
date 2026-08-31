export default {
  test: {
    exclude: ['node_modules', 'dist', '.direnv'],
    fileParallelism: false,
    pool: 'forks',
  },
};
